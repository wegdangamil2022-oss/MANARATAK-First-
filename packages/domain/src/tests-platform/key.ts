import { InternationalTestCategory, InternationalTestDeliveryMode } from './enums';

export class InternationalTestDeterministicKey {
  static generate(params: {
    testName: string;
    providerName: string;
    category: InternationalTestCategory | string;
    deliveryMode?: InternationalTestDeliveryMode | string;
    variantName?: string;
  }): string {
    const { testName, providerName, category, deliveryMode, variantName } = params;

    if (!testName || testName.trim() === '') {
      throw new Error('testName is required to generate a deterministic key');
    }
    if (!providerName || providerName.trim() === '') {
      throw new Error('providerName is required to generate a deterministic key');
    }
    if (!category || category.toString().trim() === '') {
      throw new Error('category is required to generate a deterministic key');
    }

    const clean = (str: string) => str.trim().replace(/\s+/g, ' ').toUpperCase();

    const parts = [
      clean(category.toString()),
      clean(providerName),
      clean(testName)
    ];

    if (deliveryMode && deliveryMode.toString().trim() !== '') {
      parts.push(clean(deliveryMode.toString()));
    }

    if (variantName && variantName.trim() !== '') {
      parts.push(clean(variantName));
    }

    return parts.join(':');
  }
}
