import { PrismaTestDiscoveryLinkRepository } from '../integration/PrismaTestDiscoveryLinkRepository';
export class PrismaServiceTestDiscoveryLinkRepository extends PrismaTestDiscoveryLinkRepository {
  readonly ownerDomain = 'SERVICES' as const;
  protected table(client: any = this.prisma): any {
    return client.serviceTestDiscoveryLink;
  }
}
