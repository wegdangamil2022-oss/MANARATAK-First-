import { InvoiceStatus } from '../enums/InvoiceStatus';
import { MoneyAmount } from '../value-objects/MoneyAmount';

export interface InvoiceLineItemDto {
  description: string;
  quantity: number;
  unitPrice: MoneyAmount;
  totalPrice: MoneyAmount;
  metadata?: Record<string, unknown> | null;
}

export interface FinanceInvoiceDto {
  id: string;
  publicId: string;
  invoiceNumber: string;
  correlationId?: string | null;
  originDomain: string;
  originReferenceId: string;
  studentReferenceId?: string | null;
  payerReferenceId?: string | null;
  status: InvoiceStatus;
  totalAmount: MoneyAmount;
  amountDue: MoneyAmount;
  lineItems: InvoiceLineItemDto[];
  dueDate?: Date | string | null;
  issuedAt?: Date | string | null;
  paidAt?: Date | string | null;
  voidedAt?: Date | string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface CreateFinanceInvoiceDto {
  publicId: string;
  invoiceNumber: string;
  correlationId?: string | null;
  originDomain: string;
  originReferenceId: string;
  studentReferenceId?: string | null;
  payerReferenceId?: string | null;
  status: InvoiceStatus;
  totalAmount: MoneyAmount;
  amountDue: MoneyAmount;
  lineItems: InvoiceLineItemDto[];
  dueDate?: Date | string | null;
  issuedAt?: Date | string | null;
  metadata?: Record<string, unknown> | null;
}

export interface FinanceInvoiceFilters {
  status?: InvoiceStatus;
  originDomain?: string;
  originReferenceId?: string;
  studentReferenceId?: string;
  payerReferenceId?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface PaginatedFinanceResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
