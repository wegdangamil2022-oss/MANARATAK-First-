import { IExecutionPolicy } from './IExecutionPolicy';
import { IExecutionContext } from './IExecutionContext';
import { IExecutionState } from './IExecutionState';

export interface IExecutionStrategy<TInput = unknown> {
  /**
   * Executes a specific logical unit of work within the defined policy and context constraints.
   *
   * @param input The generic payload or input task for the execution unit.
   * @param context The immutable execution context providing contextual properties and cancellation signals.
   * @param policy The execution policy defining constraints such as concurrency and ordering.
   * @returns A promise resolving to the resulting execution state for this unit of work.
   */
  execute(input: TInput, context: IExecutionContext, policy: IExecutionPolicy): Promise<IExecutionState>;
}
