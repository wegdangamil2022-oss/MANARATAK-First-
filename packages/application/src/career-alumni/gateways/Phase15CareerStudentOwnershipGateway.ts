import { ICareerStudentOwnershipGateway, IStudentWorkspaceRepository, StudentWorkspaceStatus } from '@manaratak/domain';

export class Phase15CareerStudentOwnershipGateway implements ICareerStudentOwnershipGateway {
  constructor(private readonly students: IStudentWorkspaceRepository) {}

  async assertActiveStudent(studentReferenceId: string): Promise<void> {
    if (!studentReferenceId.trim()) throw new Error('CAREER_STUDENT_REFERENCE_REQUIRED');
    const workspace = await this.students.findWorkspace(studentReferenceId);
    if (!workspace) throw new Error('CAREER_STUDENT_NOT_FOUND');
    if (workspace.status !== StudentWorkspaceStatus.ACTIVE) throw new Error(`CAREER_STUDENT_NOT_ACTIVE:${workspace.status}`);
  }
}
