export interface IDependencyContainer {
  register<T>(name: string, implementation: T): void;
  resolve<T>(name: string): T;
}
