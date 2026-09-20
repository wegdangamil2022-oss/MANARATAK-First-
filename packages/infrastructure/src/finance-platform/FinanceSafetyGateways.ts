import {
  IBankTransferGateway,
  IBankTransferGatewayRegistry,
  IFinanceCurrencyReferenceGateway,
  IPaymentGateway,
  IPaymentGatewayRegistry,
} from '@manaratak/domain';

export class PrismaFinanceCurrencyReferenceGateway implements IFinanceCurrencyReferenceGateway {
  constructor(private readonly db: any) {}

  async resolveCurrency(currencyCode: string) {
    const code = currencyCode.trim().toUpperCase();
    const row = await this.db.referenceCurrency.findUnique({ where: { isoCode: code } });
    if (!row || !row.isActive || row.minorUnit == null) return null;
    return {
      referenceId: row.id,
      currencyCode: row.isoCode,
      scale: row.minorUnit,
      active: row.isActive,
    };
  }
}

export class FinancePaymentGatewayRegistry implements IPaymentGatewayRegistry {
  private readonly providers: ReadonlyMap<string, IPaymentGateway>;
  constructor(providers: readonly IPaymentGateway[]) {
    this.providers = new Map(providers.map((provider) => [provider.providerKey, provider]));
  }
  get(providerKey: string): IPaymentGateway | null {
    return this.providers.get(providerKey.trim()) ?? null;
  }
  list(): readonly IPaymentGateway[] {
    return [...this.providers.values()];
  }
}

export class FinanceBankTransferGatewayRegistry implements IBankTransferGatewayRegistry {
  private readonly providers: ReadonlyMap<string, IBankTransferGateway>;
  constructor(providers: readonly IBankTransferGateway[]) {
    this.providers = new Map(providers.map((provider) => [provider.providerKey, provider]));
  }
  get(providerKey: string): IBankTransferGateway | null {
    return this.providers.get(providerKey.trim()) ?? null;
  }
  list(): readonly IBankTransferGateway[] {
    return [...this.providers.values()];
  }
}
