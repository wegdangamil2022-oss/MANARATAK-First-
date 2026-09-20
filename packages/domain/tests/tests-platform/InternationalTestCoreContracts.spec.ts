import { describe, it, expect } from 'vitest';
import { 
  InternationalTestDeterministicKey,
  InternationalTestStatus,
  InternationalTestCategory,
  InternationalTestDeliveryMode,
  InternationalTestDto
} from '../../src/tests-platform';

describe('InternationalTestCoreContracts', () => {
  it('should format deterministic keys correctly', () => {
    const key = InternationalTestDeterministicKey.generate({
      testName: ' TOEFL iBT  ',
      providerName: '  ETS ',
      category: InternationalTestCategory.LANGUAGE_PROFICIENCY,
      deliveryMode: InternationalTestDeliveryMode.ONLINE,
      variantName: '  Home Edition  '
    });
    
    expect(key).toBe('LANGUAGE_PROFICIENCY:ETS:TOEFL IBT:ONLINE:HOME EDITION');
  });

  it('should omit empty optional fields in key', () => {
    const key = InternationalTestDeterministicKey.generate({
      testName: ' IELTS ',
      providerName: ' British Council ',
      category: InternationalTestCategory.LANGUAGE_PROFICIENCY
    });
    
    expect(key).toBe('LANGUAGE_PROFICIENCY:BRITISH COUNCIL:IELTS');
  });

  it('should throw error if testName is missing', () => {
    expect(() => InternationalTestDeterministicKey.generate({
      testName: ' ',
      providerName: 'ETS',
      category: InternationalTestCategory.LANGUAGE_PROFICIENCY
    })).toThrowError('testName is required');
  });

  it('should throw error if providerName is missing', () => {
    expect(() => InternationalTestDeterministicKey.generate({
      testName: 'TOEFL',
      providerName: '',
      category: InternationalTestCategory.LANGUAGE_PROFICIENCY
    })).toThrowError('providerName is required');
  });

  it('should throw error if category is missing', () => {
    expect(() => InternationalTestDeterministicKey.generate({
      testName: 'TOEFL',
      providerName: 'ETS',
      category: '' as any
    })).toThrowError('category is required');
  });

  it('should support DTO shape correctly without polluting domains', () => {
    const dto: InternationalTestDto = {
      id: 'test-123',
      canonicalName: 'TOEFL iBT',
      testCategory: InternationalTestCategory.LANGUAGE_PROFICIENCY,
      providerName: 'ETS',
      status: InternationalTestStatus.PUBLISHED,
      isPubliclyVisible: true,
      isSourceVerified: true,
      fees: [
        {
          id: 'fee-1',
          feeType: 'REGISTRATION',
          amount: 250,
          currencyCode: 'USD',
          hasRegionalVariation: true
        }
      ],
      availability: {
        id: 'avail-1',
        availableCountryIds: ['USA', 'CAN']
      },
      crossPhaseReferences: {
        universityIds: ['uni-1']
      }
    };
    
    expect(dto.id).toBe('test-123');
    expect(dto.fees![0].feeType).toBe('REGISTRATION');
  });
});
