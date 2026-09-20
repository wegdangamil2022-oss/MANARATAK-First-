import { LocalizationScopeType } from '@manaratak/domain';

export interface CreateLocalizationDto {
  reference: string;
  ownerReference: string;
  locale: string;
  definition: {
    name: string;
    description: string;
  };
  translationDefinition: {
    translations: Record<string, string>;
  };
  classification: {
    scope: LocalizationScopeType;
  };
  intent: {
    goal: string;
    businessJustification: string;
  };
  metadata: Record<string, string>;
}

export interface UpdateLocalizationDto {
  definition: {
    name: string;
    description: string;
  };
  translationDefinition: {
    translations: Record<string, string>;
  };
  classification: {
    scope: LocalizationScopeType;
  };
  intent: {
    goal: string;
    businessJustification: string;
  };
}

export interface LocalizationResponseDto {
  reference: string;
  ownerReference: string;
  locale: string;
  version: string;
  lifecycleState: string;
  definition: {
    name: string;
    description: string;
  };
  translationDefinition: {
    translations: Record<string, string>;
  };
  classification: {
    scope: string;
  };
  intent: {
    goal: string;
    businessJustification: string;
  };
  metadata: Record<string, string>;
}

// Translation WP08 API-facing facade over the canonical WP01 locale contract.
// The API depends on @manaratak/application, while the authoritative locale
// definitions remain owned by @manaratak/shared.
export {
  DEFAULT_LOCALE as APPLICATION_DEFAULT_LOCALE,
  SUPPORTED_LOCALES as APPLICATION_SUPPORTED_LOCALES,
  isSupportedLocale as isApplicationSupportedLocale,
} from '@manaratak/shared';
export type { SupportedLocale as ApplicationSupportedLocale } from '@manaratak/shared';
