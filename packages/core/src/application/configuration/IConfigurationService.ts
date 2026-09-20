export interface IConfigurationService {
  get<T>(key: string): T;
  getOptional<T>(key: string): T | undefined;
  getString(key: string): string;
  getNumber(key: string): number;
  getBoolean(key: string): boolean;
}
