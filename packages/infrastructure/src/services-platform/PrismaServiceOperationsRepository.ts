import { PrismaClient } from '@prisma/client';
import {
  CreateServiceBookingInput,
  IServiceOperationsRepository,
  ServiceAvailabilitySlotDto,
  ServiceBookingDto,
  ServiceBookingStatus,
  ServiceDeliveryArtifactDto,
  ServiceDiscountDto,
  ServicePackageDto,
  ServicePackageStatus,
  ServicePricingDto,
  ServicePricingStatus,
  ServicePromotionDto,
  ServicePromotionStatus,
  ServiceProviderDto,
  ServiceProviderStatus,
  ServiceWorkflowDefinitionDto,
  ServiceWorkflowDefinitionStatus,
  ServiceWorkflowExecutionDto,
} from '@manaratak/domain';

const object = (value: unknown): Record<string, unknown> | null => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
const array = <T = unknown>(value: unknown): T[] => Array.isArray(value) ? value as T[] : [];

export class PrismaServiceOperationsRepository implements IServiceOperationsRepository {
  constructor(private readonly prisma: PrismaClient) {}
  private p(client: any = this.prisma as any) { return client; }

  async createProvider(data: Omit<ServiceProviderDto, 'id' | 'createdAt' | 'updatedAt'>): Promise<ServiceProviderDto> {
    const row = await this.p().serviceProviderRecord.create({
      data: {
        publicId: data.publicId, displayName: data.displayName, status: data.status, timezone: data.timezone, capacity: data.capacity,
        countryReferenceId: data.countryReferenceId ?? null, qualificationMetadata: data.qualificationMetadata ?? null,
        supportedServices: { create: data.supportedServiceIds.map((serviceId) => ({ serviceId })) },
      },
      include: { supportedServices: true },
    });
    return this.mapProvider(row);
  }

  async updateProviderStatus(id: string, status: ServiceProviderStatus): Promise<ServiceProviderDto> {
    return this.mapProvider(await this.p().serviceProviderRecord.update({ where: { id }, data: { status }, include: { supportedServices: true } }));
  }

  async findProviderById(id: string): Promise<ServiceProviderDto | null> {
    const row = await this.p().serviceProviderRecord.findUnique({ where: { id }, include: { supportedServices: true } });
    return row ? this.mapProvider(row) : null;
  }

  async createPackage(data: Omit<ServicePackageDto, 'id' | 'createdAt' | 'updatedAt'>): Promise<ServicePackageDto> {
    const row = await this.p().servicePackageRecord.create({
      data: {
        publicId: data.publicId, displayName: data.displayName, status: data.status, metadata: data.metadata ?? null,
        items: { create: data.items.map((item) => ({ serviceId: item.serviceId, sequence: item.sequence, quantity: item.quantity, required: item.required })) },
      },
      include: { items: { orderBy: { sequence: 'asc' } } },
    });
    return this.mapPackage(row);
  }

  async updatePackageStatus(id: string, status: ServicePackageStatus): Promise<ServicePackageDto> {
    return this.mapPackage(await this.p().servicePackageRecord.update({ where: { id }, data: { status }, include: { items: { orderBy: { sequence: 'asc' } } } }));
  }

  async findPackageById(id: string): Promise<ServicePackageDto | null> {
    const row = await this.p().servicePackageRecord.findUnique({ where: { id }, include: { items: { orderBy: { sequence: 'asc' } } } });
    return row ? this.mapPackage(row) : null;
  }

  async createPricing(data: Omit<ServicePricingDto, 'id' | 'createdAt'>): Promise<ServicePricingDto> {
    return this.mapPricing(await this.p().servicePricingRecord.create({ data }));
  }

  async updatePricingStatus(id: string, status: ServicePricingStatus): Promise<ServicePricingDto> {
    return this.mapPricing(await this.p().servicePricingRecord.update({ where: { id }, data: { status } }));
  }
  async findPricingById(id: string): Promise<ServicePricingDto | null> {
    const row = await this.p().servicePricingRecord.findUnique({ where: { id } });
    return row ? this.mapPricing(row) : null;
  }

  async retirePricing(id: string, effectiveTo: Date): Promise<void> {
    await this.p().servicePricingRecord.update({ where: { id }, data: { status: ServicePricingStatus.RETIRED, effectiveTo } });
  }

  async findActivePricing(serviceId: string | null, packageId: string | null, at: Date): Promise<ServicePricingDto | null> {
    const row = await this.p().servicePricingRecord.findFirst({
      where: {
        serviceId, packageId, status: ServicePricingStatus.ACTIVE, effectiveFrom: { lte: at },
        OR: [{ effectiveTo: null }, { effectiveTo: { gt: at } }],
      },
      orderBy: [{ effectiveFrom: 'desc' }, { createdAt: 'desc' }],
    });
    return row ? this.mapPricing(row) : null;
  }

  async createDiscount(data: Omit<ServiceDiscountDto, 'id' | 'createdAt'>): Promise<ServiceDiscountDto> {
    return this.mapDiscount(await this.p().serviceDiscountRecord.create({ data }));
  }
  async findDiscountById(id: string): Promise<ServiceDiscountDto | null> {
    const row = await this.p().serviceDiscountRecord.findUnique({ where: { id } });
    return row ? this.mapDiscount(row) : null;
  }
  async createPromotion(data: Omit<ServicePromotionDto, 'id' | 'createdAt' | 'updatedAt'>): Promise<ServicePromotionDto> {
    return this.mapPromotion(await this.p().servicePromotionRecord.create({ data }));
  }
  async updatePromotionStatus(id: string, status: ServicePromotionStatus): Promise<ServicePromotionDto> {
    return this.mapPromotion(await this.p().servicePromotionRecord.update({ where: { id }, data: { status } }));
  }
  async findPromotionById(id: string): Promise<ServicePromotionDto | null> {
    const row = await this.p().servicePromotionRecord.findUnique({ where: { id } });
    return row ? this.mapPromotion(row) : null;
  }

  async createAvailabilitySlot(data: Omit<ServiceAvailabilitySlotDto, 'id' | 'createdAt' | 'updatedAt'>): Promise<ServiceAvailabilitySlotDto> {
    return this.mapSlot(await this.p().serviceAvailabilitySlotRecord.create({ data }));
  }
  async findAvailabilitySlotById(id: string): Promise<ServiceAvailabilitySlotDto | null> {
    const row = await this.p().serviceAvailabilitySlotRecord.findUnique({ where: { id } });
    return row ? this.mapSlot(row) : null;
  }

  async createBookingWithCapacity(data: CreateServiceBookingInput): Promise<ServiceBookingDto> {
    const transaction = (this.prisma as any).$transaction;
    if (typeof transaction !== 'function') throw new Error('SERVICE_BOOKING_TRANSACTION_REQUIRED');
    return transaction.call(this.prisma, async (tx: any) => {
      const slot = await tx.serviceAvailabilitySlotRecord.findUnique({ where: { id: data.slotId } });
      const provider = await tx.serviceProviderRecord.findUnique({ where: { id: data.providerId }, include: { supportedServices: true } });
      if (!slot || !provider) throw new Error('SERVICE_BOOKING_CAPACITY_AUTHORITY_MISSING');
      if (provider.status !== ServiceProviderStatus.QUALIFIED) throw new Error('SERVICE_PROVIDER_NOT_QUALIFIED');
      if (slot.status !== 'AVAILABLE') throw new Error('SERVICE_BOOKING_SLOT_UNAVAILABLE');
      if (slot.providerId !== data.providerId) throw new Error('SERVICE_BOOKING_SLOT_PROVIDER_MISMATCH');
      if (!data.items.some((item) => item.serviceId === slot.serviceId)) throw new Error('SERVICE_BOOKING_SLOT_SERVICE_MISMATCH');
      const supportedServiceIds = new Set((provider.supportedServices ?? []).map((item: any) => item.serviceId));
      if (!data.items.every((item) => supportedServiceIds.has(item.serviceId))) throw new Error('SERVICE_BOOKING_PROVIDER_SCOPE_MISMATCH');
      const now = new Date();
      if (slot.startsAt <= now) throw new Error('SERVICE_BOOKING_SLOT_ALREADY_STARTED');
      const price = await tx.servicePricingRecord.findUnique({ where: { id: data.pricingSnapshot.pricingId } });
      if (!price || price.status !== ServicePricingStatus.ACTIVE || price.immutableFingerprint !== data.pricingSnapshot.pricingFingerprint ||
          price.effectiveFrom > now || (price.effectiveTo && price.effectiveTo <= now) ||
          price.serviceId !== (data.serviceId ?? null) || price.packageId !== (data.packageId ?? null)) {
        throw new Error('SERVICE_BOOKING_PRICING_SNAPSHOT_STALE');
      }
      if (data.pricingSnapshot.discountId) {
        const discount = await tx.serviceDiscountRecord.findUnique({ where: { id: data.pricingSnapshot.discountId } });
        if (!discount || discount.activeFrom > now || (discount.activeTo && discount.activeTo <= now)) throw new Error('SERVICE_DISCOUNT_NOT_ACTIVE');
        if (discount.serviceId && discount.serviceId !== (data.serviceId ?? null)) throw new Error('SERVICE_DISCOUNT_SCOPE_MISMATCH');
        if (discount.packageId && discount.packageId !== (data.packageId ?? null)) throw new Error('SERVICE_DISCOUNT_SCOPE_MISMATCH');
        if (discount.maxRedemptions != null && discount.redemptionCount >= discount.maxRedemptions) throw new Error('SERVICE_DISCOUNT_REDEMPTION_LIMIT_REACHED');
        const redeemed = await tx.serviceDiscountRecord.updateMany({
          where: { id: discount.id, redemptionCount: discount.redemptionCount },
          data: { redemptionCount: { increment: 1 } },
        });
        if (redeemed.count !== 1) throw new Error('SERVICE_DISCOUNT_ATOMIC_REDEMPTION_CONFLICT');
      }
      const capacity = Math.min(slot.capacity, provider.capacity);
      const activeStatuses = [ServiceBookingStatus.PENDING, ServiceBookingStatus.CONFIRMED, ServiceBookingStatus.IN_PROGRESS];
      const activeCount = await tx.serviceBookingRecord.count({
        where: { slotId: data.slotId, status: { in: activeStatuses } },
      });
      if (activeCount >= capacity) throw new Error('SERVICE_BOOKING_CAPACITY_EXHAUSTED');
      const overlappingAssignments = await tx.serviceBookingRecord.count({
        where: {
          providerId: data.providerId,
          status: { in: activeStatuses },
          startsAt: { lt: slot.endsAt },
          endsAt: { gt: slot.startsAt },
        },
      });
      if (overlappingAssignments >= provider.capacity) throw new Error('SERVICE_PROVIDER_CONCURRENT_CAPACITY_EXHAUSTED');
      const row = await tx.serviceBookingRecord.create({
        data: {
          publicId: data.publicId, studentReferenceId: data.studentReferenceId, serviceId: data.serviceId ?? null, packageId: data.packageId ?? null,
          providerId: data.providerId, slotId: data.slotId, status: ServiceBookingStatus.PENDING,
          startsAt: slot.startsAt, endsAt: slot.endsAt, timezone: slot.timezone, pricingSnapshot: data.pricingSnapshot,
          items: { create: data.items.map((item) => ({ serviceId: item.serviceId, packageItemId: item.packageItemId ?? null, sequence: item.sequence, quantity: item.quantity, status: item.status })) },
        },
        include: { items: { orderBy: { sequence: 'asc' } } },
      });
      return this.mapBooking(row);
    }, { isolationLevel: 'Serializable' });
  }

  async findBookingById(id: string): Promise<ServiceBookingDto | null> {
    const row = await this.p().serviceBookingRecord.findUnique({ where: { id }, include: { items: { orderBy: { sequence: 'asc' } } } });
    return row ? this.mapBooking(row) : null;
  }
  async updateBookingStatus(id: string, status: ServiceBookingStatus): Promise<ServiceBookingDto> {
    return this.mapBooking(await this.p().serviceBookingRecord.update({ where: { id }, data: { status }, include: { items: { orderBy: { sequence: 'asc' } } } }));
  }

  async createWorkflowDefinition(data: Omit<ServiceWorkflowDefinitionDto, 'id' | 'createdAt' | 'updatedAt'>): Promise<ServiceWorkflowDefinitionDto> {
    return this.mapWorkflowDefinition(await this.p().serviceWorkflowDefinitionRecord.create({ data: { ...data, steps: data.steps } }));
  }
  async updateWorkflowDefinitionStatus(id: string, status: ServiceWorkflowDefinitionStatus): Promise<ServiceWorkflowDefinitionDto> {
    return this.mapWorkflowDefinition(await this.p().serviceWorkflowDefinitionRecord.update({ where: { id }, data: { status } }));
  }
  async findWorkflowDefinitionById(id: string): Promise<ServiceWorkflowDefinitionDto | null> {
    const row = await this.p().serviceWorkflowDefinitionRecord.findUnique({ where: { id } });
    return row ? this.mapWorkflowDefinition(row) : null;
  }
  async findActiveWorkflowDefinition(serviceId: string | null, packageId: string | null): Promise<ServiceWorkflowDefinitionDto | null> {
    const row = await this.p().serviceWorkflowDefinitionRecord.findFirst({ where: { serviceId, packageId, status: 'ACTIVE' }, orderBy: { updatedAt: 'desc' } });
    return row ? this.mapWorkflowDefinition(row) : null;
  }
  async createWorkflowExecution(data: Omit<ServiceWorkflowExecutionDto, 'id' | 'createdAt' | 'updatedAt'>): Promise<ServiceWorkflowExecutionDto> {
    return this.mapWorkflowExecution(await this.p().serviceWorkflowExecutionRecord.create({ data }));
  }
  async updateWorkflowExecution(id: string, data: Partial<Pick<ServiceWorkflowExecutionDto, 'status' | 'currentStepKey' | 'startedAt' | 'completedAt' | 'failureReason'>>): Promise<ServiceWorkflowExecutionDto> {
    return this.mapWorkflowExecution(await this.p().serviceWorkflowExecutionRecord.update({ where: { id }, data }));
  }
  async addDeliveryArtifact(data: Omit<ServiceDeliveryArtifactDto, 'id' | 'deliveredAt'>): Promise<ServiceDeliveryArtifactDto> {
    return this.mapArtifact(await this.p().serviceDeliveryArtifactRecord.create({ data }));
  }

  private mapProvider(row: any): ServiceProviderDto { return { ...row, supportedServiceIds: (row.supportedServices ?? []).map((item: any) => item.serviceId), qualificationMetadata: object(row.qualificationMetadata) }; }
  private mapPackage(row: any): ServicePackageDto { return { ...row, items: (row.items ?? []).map((item: any) => ({ id: item.id, packageId: item.packageId, serviceId: item.serviceId, sequence: item.sequence, quantity: item.quantity, required: item.required })), metadata: object(row.metadata) }; }
  private mapPricing(row: any): ServicePricingDto { return { ...row }; }
  private mapDiscount(row: any): ServiceDiscountDto { return { ...row }; }
  private mapPromotion(row: any): ServicePromotionDto { return { ...row, metadata: object(row.metadata) }; }
  private mapSlot(row: any): ServiceAvailabilitySlotDto { return { ...row }; }
  private mapBooking(row: any): ServiceBookingDto { return { ...row, pricingSnapshot: object(row.pricingSnapshot) as any, items: array(row.items).map((item: any) => ({ ...item })) }; }
  private mapWorkflowDefinition(row: any): ServiceWorkflowDefinitionDto { return { ...row, steps: array(row.steps) as any }; }
  private mapWorkflowExecution(row: any): ServiceWorkflowExecutionDto { return { ...row }; }
  private mapArtifact(row: any): ServiceDeliveryArtifactDto { return { ...row }; }
}
