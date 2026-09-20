import { IExecutionDefinition } from './IExecutionDefinition';
import { IExecutionContext } from './IExecutionContext';
import { IResolvedExecution } from './IResolvedExecution';

export interface IExecutionResolutionBoundary {
  /**
   * Resolves an execution definition across the architectural boundary, yielding a resolved execution.
   *
   * @param definition The declarative, immutable execution definition.
   * @param context The immutable execution context for resolution.
   * @returns A promise resolving to the immutable resolved execution.
   */
  resolve(
    definition: IExecutionDefinition,
    context: IExecutionContext
  ): Promise<IResolvedExecution>;
}
