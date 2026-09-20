import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { FinanceAdminRouter } from '../../../../src/presentation/api/router/FinanceAdminRouter';

describe('FinanceAdminRouter', () => {
  it('does not expose arbitrary invoice creation through the admin route', async () => {
    const financeAdminUseCases = {
      issueInvoice: vi.fn().mockResolvedValue({ id: 'inv-1', invoiceNumber: 'INV-1' }),
      listInvoices: vi.fn(),
      getInvoice: vi.fn(),
      voidInvoice: vi.fn(),
      recordCapturedPayment: vi.fn(),
      listPaymentsForInvoice: vi.fn(),
    };
    const financePlatformUseCases = {
      createDraftInvoice: vi.fn().mockResolvedValue({ id: 'inv-1', status: 'DRAFT' }),
    };
    const app = express();
    app.use(express.json());
    app.use((req, _res, next) => {
      (req as any).authUserId = 'admin-1';
      next();
    });
    app.use(
      '/admin/finance',
      FinanceAdminRouter.create({
        financeAdminUseCases: financeAdminUseCases as any,
        financePlatformUseCases: financePlatformUseCases as any,
        authEvaluatorService: { evaluatePermission: vi.fn().mockResolvedValue({ isGranted: true }) } as any,
      }),
    );

    const response = await request(app)
      .post('/admin/finance/invoices')
      .set('Idempotency-Key', 'invoice-1')
      .send({
        originDomain: 'SERVICES',
        originReferenceId: 'svc-order-1',
        lineItems: [
          {
            description: 'Visa preparation',
            quantity: 1,
            unitPrice: { amountMinorUnits: '5000', currencyCode: 'USD', scale: 2 },
          },
        ],
      });

    expect(response.status).toBe(404);
    expect(financePlatformUseCases.createDraftInvoice).not.toHaveBeenCalled();
  });

  it('keeps invoice creation unavailable even for malformed payloads', async () => {
    const financeAdminUseCases = {
      issueInvoice: vi.fn(),
      listInvoices: vi.fn(),
      getInvoice: vi.fn(),
      voidInvoice: vi.fn(),
      recordCapturedPayment: vi.fn(),
      listPaymentsForInvoice: vi.fn(),
    };
    const financePlatformUseCases = { createDraftInvoice: vi.fn() };
    const app = express();
    app.use(express.json());
    app.use((req, _res, next) => {
      (req as any).authUserId = 'admin-1';
      next();
    });
    app.use(
      '/admin/finance',
      FinanceAdminRouter.create({
        financeAdminUseCases: financeAdminUseCases as any,
        financePlatformUseCases: financePlatformUseCases as any,
        authEvaluatorService: { evaluatePermission: vi.fn().mockResolvedValue({ isGranted: true }) } as any,
      }),
    );

    const response = await request(app)
      .post('/admin/finance/invoices')
      .send({
        originDomain: 'SERVICES',
        originReferenceId: 'svc-order-1',
        lineItems: [
          {
            description: 'Visa preparation',
            quantity: 1,
            unitPrice: { amountMinorUnits: '50.25', currencyCode: 'USD', scale: 2 },
          },
        ],
      });

    expect(response.status).toBe(404);
    expect(financePlatformUseCases.createDraftInvoice).not.toHaveBeenCalled();
  });
});
