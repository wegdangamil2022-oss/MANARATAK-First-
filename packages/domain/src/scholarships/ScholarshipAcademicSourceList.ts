/** Only explicit numbered entries are academic list items. Headings and prose
 * remain source context; compound entries are never split into invented majors. */
export function scholarshipAcademicSourceItems(section: string): string[] {
  return section.split(/^\s*\*\*.+?\*\*\s*$/m).flatMap(block => {
    const starts = [...block.matchAll(/^\s*\d+[.)]\s+/gm)];
    return starts.map((match, index) => block.slice(
      match.index! + match[0].length,
      starts[index + 1]?.index ?? block.length,
    ).trim()).filter(Boolean);
  });
}

