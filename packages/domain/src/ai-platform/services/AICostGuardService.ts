export class AICostGuardService {
  constructor(private readonly maxInputCharacters = 8000) {}

  assertWithinLimit(input: string): void {
    if (input.length > this.maxInputCharacters) {
      throw new Error(`AI input exceeds the configured ${this.maxInputCharacters} character limit.`);
    }
  }

  estimateTokens(text: string): number {
    return Math.max(1, Math.ceil(text.length / 4));
  }
}
