import { Prisma, PrismaClient } from '@prisma/client';
import type { GovernedReferenceEntityType } from '@manaratak/domain';
/** Reviewed scalar-code inventory. No fuzzy names, JSON inference or ID rewrites.
 * Counts exclude matching FK-backed relations when that FK is present.
 */
export const REFERENCE_CODE_USAGE_FIELDS = [
  {
    "entityType": "CURRENCY",
    "table": "UniversityTuitionProfile",
    "column": "currencyCode",
    "excludeIdField": "currencyReferenceId"
  },
  {
    "entityType": "CURRENCY",
    "table": "UniversityAccommodationProfile",
    "column": "currencyCode",
    "excludeIdField": "currencyReferenceId"
  },
  {
    "entityType": "CURRENCY",
    "table": "UniversityAccommodationProfile",
    "column": "livingCostCurrencyCode",
    "excludeIdField": "livingCostCurrencyReferenceId"
  },
  {
    "entityType": "CURRENCY",
    "table": "Scholarship",
    "column": "amountCurrencyCode",
    "excludeIdField": null
  },
  {
    "entityType": "COUNTRY",
    "table": "InternationalTestProvider",
    "column": "countryIso2Code",
    "excludeIdField": null
  },
  {
    "entityType": "CURRENCY",
    "table": "InternationalTestFeeMetadata",
    "column": "currencyCode",
    "excludeIdField": "currencyReferenceId"
  },
  {
    "entityType": "COUNTRY",
    "table": "InternationalTestCenter",
    "column": "countryIso2Code",
    "excludeIdField": null
  },
  {
    "entityType": "COUNTRY",
    "table": "InternationalTestCountryRelationship",
    "column": "countryIso2Code",
    "excludeIdField": null
  },
  {
    "entityType": "CURRENCY",
    "table": "ReferenceCountry",
    "column": "defaultCurrencyCode",
    "excludeIdField": null
  },
  {
    "entityType": "LANGUAGE",
    "table": "ReferenceCountry",
    "column": "defaultLanguageCode",
    "excludeIdField": null
  },
  {
    "entityType": "CURRENCY",
    "table": "FinanceInvoiceRecord",
    "column": "currencyCode",
    "excludeIdField": null
  },
  {
    "entityType": "CURRENCY",
    "table": "FinancePaymentRecord",
    "column": "currencyCode",
    "excludeIdField": null
  },
  {
    "entityType": "CURRENCY",
    "table": "FinancialAccountRecord",
    "column": "currencyCode",
    "excludeIdField": null
  },
  {
    "entityType": "CURRENCY",
    "table": "FinancialTransactionRecord",
    "column": "currencyCode",
    "excludeIdField": null
  },
  {
    "entityType": "CURRENCY",
    "table": "FinancialLedgerEntryRecord",
    "column": "currencyCode",
    "excludeIdField": null
  },
  {
    "entityType": "CURRENCY",
    "table": "FinanceWalletRecord",
    "column": "currencyCode",
    "excludeIdField": null
  },
  {
    "entityType": "CURRENCY",
    "table": "FinanceWalletHoldRecord",
    "column": "currencyCode",
    "excludeIdField": null
  },
  {
    "entityType": "CURRENCY",
    "table": "FinanceApprovalRecord",
    "column": "currencyCode",
    "excludeIdField": null
  },
  {
    "entityType": "CURRENCY",
    "table": "FinanceRefundRecord",
    "column": "currencyCode",
    "excludeIdField": null
  },
  {
    "entityType": "CURRENCY",
    "table": "FinanceDocumentRecord",
    "column": "currencyCode",
    "excludeIdField": null
  },
  {
    "entityType": "CURRENCY",
    "table": "FinanceInstallmentPlanRecord",
    "column": "currencyCode",
    "excludeIdField": null
  },
  {
    "entityType": "CURRENCY",
    "table": "FinanceCommissionRecord",
    "column": "currencyCode",
    "excludeIdField": null
  },
  {
    "entityType": "CURRENCY",
    "table": "ServicePricingRecord",
    "column": "currencyCode",
    "excludeIdField": null
  },
  {
    "entityType": "CURRENCY",
    "table": "ServiceDiscountRecord",
    "column": "currencyCode",
    "excludeIdField": null
  }
] as const;
export async function readReferenceCodeUsage(prisma: PrismaClient, type: GovernedReferenceEntityType, referenceId: string): Promise<Record<string,number>> {
  if (!['COUNTRY','CURRENCY','LANGUAGE'].includes(type)) return {};
  const table = type === 'COUNTRY' ? 'ReferenceCountry' : type === 'CURRENCY' ? 'ReferenceCurrency' : 'ReferenceLanguage';
  const column = type === 'COUNTRY' ? 'iso2Code' : 'isoCode';
  const owners = await prisma.$queryRaw<Array<{code:string}>>(Prisma.sql`SELECT ${Prisma.raw(`"${column}"`)} AS code FROM ${Prisma.raw(`"${table}"`)} WHERE "id"=${referenceId}`);
  if (!owners[0]) throw new Error('REFERENCE_USAGE_TARGET_NOT_FOUND');
  const inventory = REFERENCE_CODE_USAGE_FIELDS.filter(entry => entry.entityType === type);
  if (!inventory.length) return {};
  const queries = inventory.map(entry => Prisma.sql`SELECT ${`${entry.table}.${entry.column}`}::text AS key, COUNT(*)::bigint AS total FROM ${Prisma.raw(`"${entry.table}"`)} WHERE ${Prisma.raw(`"${entry.column}"`)}=${owners[0].code} ${entry.excludeIdField ? Prisma.sql`AND ${Prisma.raw(`"${entry.excludeIdField}"`)} IS NULL` : Prisma.empty}`);
  const rows = await prisma.$queryRaw<Array<{key:string;total:bigint}>>(Prisma.join(queries,' UNION ALL '));
  return Object.fromEntries(rows.map(row => [row.key,Number(row.total)]));
}
