import { PaymentStatus } from '../enums/PaymentStatus';
import { MoneyAmount } from '../value-objects/MoneyAmount';

export interface FinancePaymentDto {
  id: string;
  publicId: string;
  invoiceId: string;
  idempotencyKey?: string | null;
  amount: MoneyAmount;
  status: PaymentStatus;
  paymentMethod: string;
  gatewayProvider?: string | null;
  gatewayReference?: string | null;
  failureReason?: string | null;
  capturedAt?: Date | string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface FinancePaymentFilters {
  status?: PaymentStatus;
  invoiceId?: string;
  gatewayProvider?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface CreateFinancePaymentDto {
  publicId: string;
  invoiceId: string;
  idempotencyKey?: string | null;
  amount: MoneyAmount;
  status: PaymentStatus;
  paymentMethod: string;
  gatewayProvider?: string | null;
  gatewayReference?: string | null;
  failureReason?: string | null;
  capturedAt?: Date | string | null;
  metadata?: Record<string, unknown> | null;
}
