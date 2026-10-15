import { PrismaTestDiscoveryLinkRepository } from '../integration/PrismaTestDiscoveryLinkRepository';
export class PrismaStudentToolTestDiscoveryLinkRepository extends PrismaTestDiscoveryLinkRepository {
  readonly ownerDomain = 'STUDENT_TOOLS' as const;
  protected table(client: any = this.prisma): any {
    return client.studentToolTestDiscoveryLink;
  }
}
