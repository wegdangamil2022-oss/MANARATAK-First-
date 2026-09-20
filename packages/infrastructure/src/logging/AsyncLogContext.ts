import { AsyncLocalStorage } from 'async_hooks';
import { ILogContext } from '@manaratak/core';

export class AsyncLogContext implements ILogContext {
  private static readonly asyncLocalStorage = new AsyncLocalStorage<Map<string, unknown>>();

  public getCorrelationId(): string | undefined {
    const store = AsyncLogContext.asyncLocalStorage.getStore();
    return store?.get('correlationId') as string | undefined;
  }

  public setCorrelationId(id: string): void {
    const store = AsyncLogContext.asyncLocalStorage.getStore();
    if (store) {
      store.set('correlationId', id);
    }
  }

  public runWithContext<T>(correlationId: string, callback: () => T): T {
    const store = new Map<string, unknown>();
    store.set('correlationId', correlationId);
    return AsyncLogContext.asyncLocalStorage.run(store, callback);
  }

  public getStore(): Map<string, unknown> | undefined {
    return AsyncLogContext.asyncLocalStorage.getStore();
  }

  public run<T>(store: Map<string, unknown>, callback: () => T): T {
    return AsyncLogContext.asyncLocalStorage.run(store, callback);
  }
}
