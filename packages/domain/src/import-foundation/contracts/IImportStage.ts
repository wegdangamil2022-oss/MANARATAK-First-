export interface IImportStage<TInput, TOutput> {
  /**
   * Gets the unique identifier for the stage.
   */
  getStageId(): string;

  /**
   * Executes the generic stage processing.
   * Pipeline and orchestration logic is intentionally excluded from Phase 6.1.
   *
   * @param input The generic input context for this stage.
   * @returns The resulting output for the next stage or completion.
   */
  execute(input: TInput): Promise<TOutput>;
}
