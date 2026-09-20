export interface ParsedInternationalTestSection {
  sectionNumber: number;
  title: string;
  blockKey: string;
  content: string;
}

export class InternationalTestMarkdownParser {
  /**
   * Parses the given markdown string into top-level sections using the "## N. " header boundary.
   * If there is any content before the first section, it prepends it to the first section to avoid content loss.
   */
  public static parse(markdown: string): ParsedInternationalTestSection[] {
    const lines = markdown.split(/\r?\n/);
    const sections: ParsedInternationalTestSection[] = [];
    
    // Find all headers matching "## N. Title" (where N is an integer)
    // Supports multi-digit numbers like "## 17. " or "## 22. "
    const headers: { index: number; sectionNumber: number; title: string }[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const match = /^##\s+(\d+)\.\s*(.+)$/.exec(line.trim());
      if (match) {
        headers.push({
          index: i,
          sectionNumber: parseInt(match[1], 10),
          title: match[2].trim()
        });
      }
    }
    
    if (headers.length === 0) {
      return [];
    }
    
    // Loop through headers and slice lines
    for (let i = 0; i < headers.length; i++) {
      const currentHeader = headers[i];
      const nextHeader = headers[i + 1];
      
      const startIndex = currentHeader.index;
      const endIndex = nextHeader ? nextHeader.index : lines.length;
      
      let sectionLines = lines.slice(startIndex, endIndex);
      
      // If this is the first section, check if there is any content preceding it,
      // and prepend it to prevent content loss.
      if (i === 0 && startIndex > 0) {
        const precedingLines = lines.slice(0, startIndex);
        sectionLines = [...precedingLines, ...sectionLines];
      }
      
      const content = sectionLines.join('\n').trim();
      const blockKey = `sec-${String(currentHeader.sectionNumber).padStart(2, '0')}`;
      
      sections.push({
        sectionNumber: currentHeader.sectionNumber,
        title: currentHeader.title,
        blockKey,
        content
      });
    }
    
    return sections;
  }
}
