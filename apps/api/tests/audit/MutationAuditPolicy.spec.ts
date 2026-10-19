import { describe, expect, it } from 'vitest';
import { Request } from 'express';
import { MutationAuditPolicy } from '../../src/presentation/audit/MutationAuditMiddleware';
import { AuditHelper } from '../../src/presentation/audit/AuditHelper';
import { InMemoryAuditRecordRepository } from '@absheer/infrastructure';

function request(method: string, originalUrl: string): Request {
  return { method, originalUrl } as Request;
}

describe('MutationAuditPolicy', () => {
  it('requires audit for critical canonical and security mutations', () => {
    expect(
      MutationAuditPolicy.classify(
        request('POST', '/api/v1/admin/majors/major-1/publish'),
        'ADMIN',
      ),
    ).toBe('CRITICAL_AUDIT_REQUIRED');
    expect(
      MutationAuditPolicy.classify(
        request('DELETE', '/api/v1/admin/academic-taxonomy/edges/edge-1'),
        'ADMIN',
      ),
    ).toBe('CRITICAL_AUDIT_REQUIRED');
    expect(MutationAuditPolicy.classify(request('POST', '/api/v1/auth/logout'), 'AUTH')).toBe(
      'CRITICAL_AUDIT_REQUIRED',
    );
  });

  it('classifies non-writing POST surfaces explicitly', () => {
    expect(
      MutationAuditPolicy.classify(
        request('POST', '/api/v1/admin/imports/major-catalogs/preview'),
        'ADMIN',
      ),
    ).toBe('NO_AUDIT_REQUIRED');
    expect(
      MutationAuditPolicy.classify(
        request('POST', '/api/v1/admin/academic-taxonomy/import-handoff'),
        'ADMIN',
      ),
    ).toBe('CRITICAL_AUDIT_REQUIRED');
  });

  it.each([
    '/admin/reference-data/owner-imports/preview',
    '/admin/academic-taxonomy/imports/preview',
    '/admin/imports/unreviewed/preview',
    '/admin/cms/content/new/preview',
  ])('requires critical audit for persisted or unreviewed preview %s', (path) => {
    for (const suffix of ['', '/', '?dryRun=false']) {
      expect(
        MutationAuditPolicy.classify(request('POST', `/api/v1${path}${suffix}`), 'ADMIN'),
      ).toBe('CRITICAL_AUDIT_REQUIRED');
    }
  });

  it('exempts only reviewed POST simulations, including their trailing slash form', () => {
    for (const path of [
      '/admin/academic-taxonomy/mappings/preview',
      '/admin/academic-taxonomy/nodes/validate',
      '/admin/imports/major-catalogs/bulk/preview',
      '/admin/imports/major-detail-dossiers/preview',
      '/admin/imports/mapping-profiles/profile/preview',
      '/admin/student-tools/gpa/eligibility',
    ]) {
      expect(
        MutationAuditPolicy.classify(request('POST', `/api/v1${path}/?locale=en`), 'ADMIN'),
      ).toBe('NO_AUDIT_REQUIRED');
      expect(MutationAuditPolicy.classify(request('DELETE', `/api/v1${path}`), 'ADMIN')).toBe(
        'CRITICAL_AUDIT_REQUIRED',
      );
      expect(MutationAuditPolicy.classify(request('POST', `/api/v1${path}/extra`), 'ADMIN')).toBe(
        'CRITICAL_AUDIT_REQUIRED',
      );
    }
  });

  it('fails closed when required audit persistence fails', async () => {
    class FailingAuditRecordRepository extends InMemoryAuditRecordRepository {
      override async save(): Promise<void> {
        throw new Error('database unavailable');
      }
    }
    const repository = new FailingAuditRecordRepository();
    const req = {
      method: 'POST',
      originalUrl: '/api/v1/admin/majors/major-1/publish',
      path: '/major-1/publish',
      params: { id: 'major-1' },
      headers: {},
      body: {},
      socket: {},
      ip: '127.0.0.1',
    } as unknown as Request;

    await expect(
      AuditHelper.recordMutation(
        repository,
        req,
        {
          action: 'MUTATION_INTENT_RECORDED',
          category: 'CRITICAL_MUTATION',
          targetType: 'MAJOR',
          targetId: 'major-1',
          result: 'SUCCESS',
        },
        { reliability: 'REQUIRED', principal: 'OPTIONAL' },
      ),
    ).rejects.toThrow('database unavailable');
  });
  it('classifies protected legacy control-plane mutations as critical audit events', () => {
    expect(
      MutationAuditPolicy.classify(
        request('POST', '/api/v1/background-jobs/job-1/start'),
        'CONTROL_PLANE',
      ),
    ).toBe('CRITICAL_AUDIT_REQUIRED');
    expect(
      MutationAuditPolicy.classify(
        request('GET', '/api/v1/background-jobs/job-1/status'),
        'CONTROL_PLANE',
      ),
    ).toBe('NO_AUDIT_REQUIRED');
  });
});
