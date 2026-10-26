import type { CourseCertificateBinding } from '@manaratak/domain';

/** Narrow P14 boundary for selecting and validating a course's pinned template.
 * Course administration receives no certificate issuance/lifecycle capability. */
export interface CourseCertificateBindingOwner {
  validateCourseBinding(input: unknown): Promise<CourseCertificateBinding>;
  courseBindingStatus(
    input: unknown,
  ): Promise<{ status: 'READY' | 'UNAVAILABLE'; code: string | null }>;
  courseBindingChoices(): Promise<
    Array<
      CourseCertificateBinding & {
        name: string;
        issuerName: string;
        version: string;
      }
    >
  >;
}
