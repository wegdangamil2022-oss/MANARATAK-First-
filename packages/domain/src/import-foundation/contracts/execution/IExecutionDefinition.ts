import { IExecutionMetadata } from './IExecutionMetadata';

export interface IExecutionDefinition {
  /**
   * The immutable metadata describing this execution definition.
   */
  readonly metadata: IExecutionMetadata;

  /**
   * The immutable declarative properties defining the execution contract.
   */
  readonly properties: Readonly<Record<string, unknown>>;
}
