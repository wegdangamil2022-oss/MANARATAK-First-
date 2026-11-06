import { z } from 'zod';
import {
  scholarshipAcademicSourceItems,
  scholarshipSourceSection,
  type ScholarshipImportPayload,
} from '@manaratak/domain';

export const scholarshipAcademicOfferSchema = z
  .object({
    classification: z.literal('SOURCE_PROGRAMME_GROUPS_WITHOUT_CANONICAL_PROGRAMME_IDENTITIES'),
    groups: z
      .array(
        z
          .object({
            sourceGroupId: z.string().trim().min(1).max(100),
            degreeLabel: z.string().trim().min(1).max(100),
            degreeLevelId: z.string().uuid(),
          })
          .strict(),
      )
      .min(2)
      .max(20),
    languagePolicy: z.literal('PROGRAMME_SPECIFIC_NO_SINGLE_LANGUAGE'),
  })
  .strict();

export interface ScholarshipReviewedAcademicOffer {
  groups: Array<{
    sourceGroupId: string;
    sourceHeading: string;
    degreeLabel: string;
    degreeLevelId: string;
    items: string[];
  }>;
  languagePolicy: 'PROGRAMME_SPECIFIC_NO_SINGLE_LANGUAGE';
}

/** A source programme scope is not a canonical Major or a funded programme edge.
 * This review preserves every numbered item under its literal degree heading.
 * The command boundary separately verifies each supplied degree foreign key.
 */
export function scholarshipReviewedAcademicOffer(
  payload: ScholarshipImportPayload,
  review: z.infer<typeof scholarshipAcademicOfferSchema>,
): ScholarshipReviewedAcademicOffer | null {
  const section = scholarshipSourceSection(payload.metadata?.rawSourceSections, 'التخصصات المتاحة');
  const basics = payload.metadata?.sourceBasicFields as Record<string, unknown> | undefined;
  const presentation = payload.metadata?.sourcePresentation as
    { degreeGroups?: unknown } | undefined;
  const sourceGroups = z
    .array(z.object({ id: z.string(), title: z.string(), items: z.array(z.string()) }))
    .safeParse(presentation?.degreeGroups);
  if (
    !section ||
    !sourceGroups.success ||
    basics?.['الدرجة التعليمية'] !== payload.degreeLevel ||
    basics?.['لغة الدراسة'] !== payload.studyLanguage ||
    !payload.studyLanguage ||
    !/(?:وفق|حسب)\s+(?:البرنامج|التخصص)|(?:depending on|per) (?:the )?(?:programme|program)/i.test(
      payload.studyLanguage,
    )
  )
    return null;

  const headings = [...section.matchAll(/^\s*\*\*(.+?)\*\*\s*$/gm)];
  const groups = sourceGroups.data.filter((group) => group.title.trim());
  const allItems = scholarshipAcademicSourceItems(section);
  const groupedItems = groups.flatMap((group) => group.items);
  const studyLevels =
    payload.studyLevels === undefined
      ? undefined
      : z.array(z.string()).safeParse(payload.studyLevels);
  if (
    headings.length !== groups.length ||
    groups.length !== review.groups.length ||
    allItems.length !== groupedItems.length ||
    allItems.some((item, index) => item !== groupedItems[index]) ||
    (studyLevels &&
      (!studyLevels.success ||
        studyLevels.data.length !== review.groups.length ||
        studyLevels.data.some((label, index) => label !== review.groups[index].degreeLabel))) ||
    new Set(groups.map((group) => group.id)).size !== groups.length ||
    new Set(review.groups.map((group) => group.degreeLevelId)).size !== groups.length ||
    new Set(review.groups.map((group) => group.degreeLabel)).size !== groups.length
  )
    return null;

  let degreeRemainder = payload.degreeLevel ?? '';
  const mapped: ScholarshipReviewedAcademicOffer['groups'] = [];
  for (const [index, group] of groups.entries()) {
    const binding = review.groups[index];
    const heading = headings[index];
    const body = section.slice(
      heading.index! + heading[0].length,
      headings[index + 1]?.index ?? section.length,
    );
    const items = scholarshipAcademicSourceItems(body);
    const degreeIndex = degreeRemainder.indexOf(binding.degreeLabel);
    if (
      binding.sourceGroupId !== group.id ||
      heading[1] !== group.title ||
      !group.title.includes(binding.degreeLabel) ||
      degreeIndex < 0 ||
      !items.length ||
      items.length !== group.items.length ||
      items.some((item, i) => item !== group.items[i])
    )
      return null;
    // Labels must occur in degree-source order. Only conjunctions/punctuation may
    // separate them, never a hidden fourth degree or an omitted restriction.
    if (!/^[\sو،,.&]*$/.test(degreeRemainder.slice(0, degreeIndex))) return null;
    degreeRemainder = degreeRemainder.slice(degreeIndex + binding.degreeLabel.length);
    mapped.push({ ...binding, sourceHeading: group.title, items });
  }
  if (!/^[\sو،,.&]*$/.test(degreeRemainder)) return null;
  return { groups: mapped, languagePolicy: review.languagePolicy };
}
