import { AISafetyDecision } from '../enums';

export interface AISafetyPolicyResult {
  decision: AISafetyDecision;
  sanitizedInput: string;
  reasons: string[];
}

export class AISafetyPolicyService {
  private readonly blockedPatterns = [
    /password\s*[:=]/i,
    /secret\s*[:=]/i,
    /api[_-]?key\s*[:=]/i
  ];

  private readonly redactionPatterns = [
    { pattern: /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, replacement: '[REDACTED_EMAIL]' },
    { pattern: /\+?\d[\d\s().-]{7,}\d/g, replacement: '[REDACTED_PHONE]' }
  ];

  evaluate(input: string): AISafetyPolicyResult {
    const reasons: string[] = [];
    for (const pattern of this.blockedPatterns) {
      if (pattern.test(input)) {
        return {
          decision: AISafetyDecision.BLOCKED,
          sanitizedInput: '',
          reasons: ['Sensitive credential-like content is not allowed in AI prompts.']
        };
      }
    }

    let sanitizedInput = input;
    for (const redaction of this.redactionPatterns) {
      if (redaction.pattern.test(sanitizedInput)) {
        reasons.push('Personal contact information was redacted before AI processing.');
        sanitizedInput = sanitizedInput.replace(redaction.pattern, redaction.replacement);
      }
    }

    return {
      decision: reasons.length > 0 ? AISafetyDecision.REDACTED : AISafetyDecision.ALLOWED,
      sanitizedInput,
      reasons
    };
  }
}
