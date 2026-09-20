export interface ISanitizer {
  sanitize<T>(data: T): T;
}
