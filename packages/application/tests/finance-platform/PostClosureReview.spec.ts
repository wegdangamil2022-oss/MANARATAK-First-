import {createHash} from 'node:crypto';
import {describe, expect, it, vi} from 'vitest';
import {financeApprovalPolicy} from '@absheer/domain';
import {FinancePlatformUseCases} from '../../src/finance-platform/use-cases/FinancePlatformUseCases';

const dependencies = {
  currencyReference: {}, paymentGateways: {}, bankTransferGateways: {}, fxRateProvider: {},
  transferFeePolicy: {policyReference: 'synthetic-no-fee', basisPoints: 0},
};
const identity = {actorId: 'maker', idempotencyKey: 'synthetic-intent', expectedVersion: 1};
function fixture() {
  const repository = {
    getLedgerTransaction: vi.fn().mockResolvedValue({id: 'ledger-id', publicId: 'ledger-public', reversalId: 'prior-reversal'}),
    getApproval: vi.fn().mockResolvedValue({id: 'approval', status: 'APPROVED', makerId: 'maker',
      actionType: 'MANUAL_LEDGER_REVERSE', targetReferenceId: 'ledger-id',
      payloadHash: createHash('sha256').update(JSON.stringify({transactionId: 'ledger-id'})).digest('hex'),
      policyReference: financeApprovalPolicy('MANUAL_LEDGER_REVERSE').reference}),
    reverseLedgerTransaction: vi.fn().mockResolvedValue({id: 'prior-reversal'}),
    decideApproval: vi.fn().mockResolvedValue({id: 'approval', status: 'PENDING'}),
  };
  return {repository, useCases: new FinancePlatformUseCases(repository as never, dependencies as never)};
}
describe('Post-closure owner identity and maker boundary review', () => {
  it.each(['ledger-id', 'ledger-public'])('binds reversal of %s to the canonical owner ID, including a prior reversal read', async reference => {
    const f = fixture();
    await expect(f.useCases.reverseLedger(reference, 'approval', identity)).resolves.toMatchObject({id: 'prior-reversal'});
    expect(f.repository.getLedgerTransaction).toHaveBeenCalledWith(reference);
    expect(f.repository.reverseLedgerTransaction).toHaveBeenCalledWith('ledger-id', expect.objectContaining(identity),
      expect.objectContaining({targetReferenceId: 'ledger-id'}));
  });
  it('fails a missing owner record before consuming or reversing anything', async () => {
    const f = fixture(); f.repository.getLedgerTransaction.mockResolvedValue(null);
    await expect(f.useCases.reverseLedger('unknown', 'approval', identity)).rejects.toThrow('not found');
    expect(f.repository.getApproval).not.toHaveBeenCalled(); expect(f.repository.reverseLedgerTransaction).not.toHaveBeenCalled();
  });
  it('rejects an approval bound to a different canonical transaction', async () => {
    const f = fixture(); f.repository.getApproval.mockResolvedValue({...await f.repository.getApproval(), targetReferenceId: 'other'});
    await expect(f.useCases.reverseLedger('ledger-public', 'approval', identity)).rejects.toThrow('binding mismatch');
    expect(f.repository.reverseLedgerTransaction).not.toHaveBeenCalled();
  });
  it('rejects maker self approval at the application boundary before delegating', async () => {
    const f = fixture();
    await expect(f.useCases.decideApproval('approval', 'APPROVE', 'maker', undefined, identity)).rejects.toThrow('Maker');
    expect(f.repository.decideApproval).not.toHaveBeenCalled();
  });
  it('leaves prior checker decisions to the transactional owner so an identical retry remains possible', async () => {
    const f = fixture(); f.repository.getApproval.mockResolvedValue({makerId: 'maker', decisions: [{approverId: 'checker', decision: 'APPROVE'}]});
    await f.useCases.decideApproval('approval', 'APPROVE', 'checker', undefined, {...identity, actorId: 'checker'});
    expect(f.repository.decideApproval).toHaveBeenCalledOnce();
  });
});
