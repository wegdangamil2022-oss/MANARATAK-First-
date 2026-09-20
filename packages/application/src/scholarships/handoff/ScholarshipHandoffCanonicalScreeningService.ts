import type { ScholarshipImportPayload } from '@manaratak/domain';
import {
  ScholarshipCanonicalResolutionService,
  type ScholarshipCanonicalResolutionRequest,
  type ScholarshipCanonicalResolutionResult,
} from '../resolution';
import type { IScholarshipHandoffCanonicalScreening } from './ScholarshipImportHandoffContracts';

export class ScholarshipHandoffCanonicalScreeningService
  implements IScholarshipHandoffCanonicalScreening
{
  constructor(private readonly resolver: ScholarshipCanonicalResolutionService) {}

  async screen(payload: ScholarshipImportPayload): Promise<ScholarshipCanonicalResolutionResult[]> {
    return this.resolver.resolveMany(this.buildRequests(payload));
  }

  private buildRequests(payload: ScholarshipImportPayload): ScholarshipCanonicalResolutionRequest[] {
    const requests: ScholarshipCanonicalResolutionRequest[] = [];

    if (payload.providerName) {
      requests.push({
        target: 'PROVIDER_UNIVERSITY',
        rawValue: payload.providerName,
        providerKind: 'UNKNOWN',
        optional: true,
      });
    }

    for (const country of this.stringValues(payload.studyCountry, payload.targetCountries)) {
      requests.push({ target: 'COUNTRY', rawValue: country, optional: true });
    }

    for (const language of this.stringValues(payload.studyLanguage)) {
      requests.push({ target: 'LANGUAGE', rawValue: language, optional: true });
    }

    for (const currency of this.stringValues(payload.currency, payload.amountCurrencyCode)) {
      requests.push({
        target: 'CURRENCY',
        rawValue: currency,
        standardCode: /^[A-Za-z]{3}$/.test(currency) ? currency.toUpperCase() : undefined,
        optional: true,
      });
    }

    for (const degree of this.stringValues(payload.degreeLevel, payload.studyLevels)) {
      requests.push({ target: 'DEGREE_LEVEL', rawValue: degree, optional: true });
    }

    for (const major of this.stringValues(payload.eligibleMajorsOrFields)) {
      requests.push({ target: 'MAJOR', rawValue: major, optional: true });
    }

    for (const reference of payload.targetUniversityReferences ?? []) {
      requests.push({
        target: 'UNIVERSITY',
        canonicalId: reference.canonicalId,
        rawValue: reference.sourceLabel ?? null,
        optional: true,
      });
    }
    for (const university of this.stringValues(payload.targetUniversities)) {
      requests.push({ target: 'UNIVERSITY', rawValue: university, optional: true });
    }

    for (const reference of payload.targetAcademicProgramReferences ?? []) {
      requests.push({
        target: 'ACADEMIC_PROGRAM',
        canonicalId: reference.canonicalId,
        rawValue: reference.sourceLabel ?? null,
        optional: true,
      });
    }
    for (const program of this.stringValues(payload.targetAcademicPrograms)) {
      requests.push({ target: 'ACADEMIC_PROGRAM', rawValue: program, optional: true });
    }

    const internationalTests = payload.metadata?.internationalTests;
    for (const test of this.stringValues(internationalTests)) {
      requests.push({ target: 'INTERNATIONAL_TEST', rawValue: test, optional: true });
    }

    return this.uniqueRequests(requests);
  }

  private stringValues(...values: unknown[]): string[] {
    return values.flatMap((value) => {
      if (typeof value === 'string') return [value];
      if (!Array.isArray(value)) return [];
      return value.filter((item): item is string => typeof item === 'string');
    }).map((value) => value.normalize('NFKC').trim().replace(/\s+/g, ' ')).filter(Boolean);
  }

  private uniqueRequests(
    requests: ScholarshipCanonicalResolutionRequest[],
  ): ScholarshipCanonicalResolutionRequest[] {
    const seen = new Set<string>();
    return requests.filter((request) => {
      const key = [
        request.target,
        request.canonicalId ?? '',
        request.standardCode ?? '',
        request.rawValue ?? '',
      ].join('|');
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
}
