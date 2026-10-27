/** Defaults are structural only; never invent a student's achievements or background. */
export function toolTestInput(toolKey: string, value: Record<string, unknown>, language: string) {
  if (toolKey !== 'motivation-letter-generator') return value;
  return {
    ...value,
    studentBackground: {
      academicInterests: [],
      experiences: [],
      achievements: [],
      skills: [],
      ...(value.studentBackground as object),
    },
    motivation: { emphasizedExperiences: [], ...(value.motivation as object) },
    outputPreferences: {
      language,
      tone: 'FORMAL',
      targetWords: 500,
      ...(value.outputPreferences as object),
    },
  };
}
