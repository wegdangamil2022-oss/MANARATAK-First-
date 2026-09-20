import { PrismaClient } from '@prisma/client';
import { ApiService } from '@manaratak/domain';
import { IApiExposureGateway } from '@manaratak/application';

export class PrismaApiExposureGateway implements IApiExposureGateway {
  constructor(private readonly prisma: PrismaClient) {}
  async expose(apiService: ApiService): Promise<void> {
    const intent = apiService.getExposureIntent();
    await (this.prisma as any).apiServiceExposureProjection.upsert({
      where: { serviceReference: apiService.getReference().getValue() },
      update: {
        serviceId: apiService.getId().getValue(), lifecycleState: apiService.getLifecycleState(),
        exposureIntent: this.intent(intent), exposedAt: new Date(), decommissionedAt: null,
      },
      create: {
        serviceReference: apiService.getReference().getValue(), serviceId: apiService.getId().getValue(),
        lifecycleState: apiService.getLifecycleState(), exposureIntent: this.intent(intent), exposedAt: new Date(),
      },
    });
  }
  async decommission(apiService: ApiService): Promise<void> {
    const intent = apiService.getExposureIntent();
    await (this.prisma as any).apiServiceExposureProjection.upsert({
      where: { serviceReference: apiService.getReference().getValue() },
      update: { lifecycleState: apiService.getLifecycleState(), exposureIntent: this.intent(intent), decommissionedAt: new Date() },
      create: {
        serviceReference: apiService.getReference().getValue(), serviceId: apiService.getId().getValue(),
        lifecycleState: apiService.getLifecycleState(), exposureIntent: this.intent(intent), decommissionedAt: new Date(),
      },
    });
  }
  private intent(intent: ReturnType<ApiService['getExposureIntent']>) {
    return { exposePublicly: intent.getExposePublicly(), environmentTarget: intent.getEnvironmentTarget(), networkCategory: intent.getNetworkCategory() };
  }
}
