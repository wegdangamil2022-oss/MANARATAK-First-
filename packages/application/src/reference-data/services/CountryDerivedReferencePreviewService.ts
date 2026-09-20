import type { CountrySourceRecord } from './CountryImportPreviewService';

export interface DerivedReferenceCandidate {
  code: string;
  usageCount: number;
  countryIso2Codes: string[];
  roles: string[];
  suggestedDisplayName?: string;
  suggestedDirection?: 'LTR' | 'RTL';
  authorityStatus: 'SOURCE_CODE_ONLY';
}

export interface CountryDerivedReferencePreview {
  mode: 'DRY_RUN';
  databaseWrites: 0;
  currencies: DerivedReferenceCandidate[];
  languages: DerivedReferenceCandidate[];
  promotionAllowed: false;
  promotionBlockers: string[];
}

export class CountryDerivedReferencePreviewService {
  public preview(records: CountrySourceRecord[]): CountryDerivedReferencePreview {
    const currencies = new Map<string, CandidateAccumulator>();
    const languages = new Map<string, CandidateAccumulator>();

    for (const record of records) {
      const countryIso2 = this.text(record.iso_alpha2)?.toUpperCase();
      this.add(currencies, record.default_currency, countryIso2, 'DEFAULT_CURRENCY', true);
      this.add(currencies, record.official_currencies, countryIso2, 'OFFICIAL_CURRENCY', true);
      this.add(languages, record.default_language, countryIso2, 'DEFAULT_LANGUAGE');
      this.add(languages, record.official_languages, countryIso2, 'OFFICIAL_LANGUAGE');
      this.add(languages, record.local_languages, countryIso2, 'LOCAL_LANGUAGE');
    }

    return {
      mode: 'DRY_RUN',
      databaseWrites: 0,
      currencies: this.finalize(currencies, 'currency'),
      languages: this.finalize(languages, 'language'),
      promotionAllowed: false,
      promotionBlockers: [
        'DATABASE_RECOVERY_GATE_REQUIRED',
        'AUTHORITATIVE_CURRENCY_ENRICHMENT_REQUIRED',
        'AUTHORITATIVE_LANGUAGE_ENRICHMENT_REQUIRED',
      ],
    };
  }

  private add(
    target: Map<string, CandidateAccumulator>,
    raw: unknown,
    countryIso2: string | undefined,
    role: string,
    uppercase = false,
  ): void {
    for (const item of String(raw ?? '').split(',').map(value => value.trim()).filter(Boolean)) {
      const code = uppercase ? item.toUpperCase() : item.toLowerCase();
      const existing = target.get(code) ?? { usageCount: 0, countries: new Set<string>(), roles: new Set<string>() };
      existing.usageCount += 1;
      if (countryIso2) existing.countries.add(countryIso2);
      existing.roles.add(role);
      target.set(code, existing);
    }
  }

  private finalize(target: Map<string, CandidateAccumulator>, type: 'currency' | 'language'): DerivedReferenceCandidate[] {
    const displayNames = this.displayNames(type);
    return [...target.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([code, value]) => ({
      code,
      usageCount: value.usageCount,
      countryIso2Codes: [...value.countries].sort(),
      roles: [...value.roles].sort(),
      suggestedDisplayName: this.suggestDisplayName(displayNames, code),
      suggestedDirection: type === 'language' ? this.suggestDirection(code) : undefined,
      authorityStatus: 'SOURCE_CODE_ONLY',
    }));
  }

  private displayNames(type: 'currency' | 'language'): Intl.DisplayNames | undefined {
    try {
      return new Intl.DisplayNames(['en'], { type });
    } catch {
      return undefined;
    }
  }

  private suggestDisplayName(displayNames: Intl.DisplayNames | undefined, code: string): string | undefined {
    try {
      return displayNames?.of(code);
    } catch {
      return undefined;
    }
  }

  private suggestDirection(code: string): 'LTR' | 'RTL' {
    return new Set(['ar', 'arc', 'dv', 'fa', 'he', 'ku', 'ps', 'sd', 'ug', 'ur', 'yi']).has(code) ? 'RTL' : 'LTR';
  }

  private text(value: unknown): string | undefined {
    const normalized = String(value ?? '').trim();
    return normalized || undefined;
  }
}

interface CandidateAccumulator {
  usageCount: number;
  countries: Set<string>;
  roles: Set<string>;
}
