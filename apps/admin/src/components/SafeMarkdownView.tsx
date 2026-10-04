import React from 'react';

interface SafeMarkdownViewProps {
  content: string;
  className?: string;
}

export const SafeMarkdownView: React.FC<SafeMarkdownViewProps> = ({ content, className = '' }) => {
  if (!content) return null;

  const lines = content.split(/\r?\n/);
  const elements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeBlockLines: string[] = [];
  let inTable = false;
  let tableRows: string[][] = [];
  let tableHeaders: string[] = [];

  const flushCodeBlock = (key: string) => {
    if (codeBlockLines.length > 0) {
      elements.push(
        <pre key={key} className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-xs font-mono my-3 leading-relaxed">
          <code>{codeBlockLines.join('\n')}</code>
        </pre>
      );
      codeBlockLines = [];
    }
  };

  const flushTable = (key: string) => {
    if (inTable && (tableHeaders.length > 0 || tableRows.length > 0)) {
      elements.push(
        <div key={key} className="overflow-x-auto my-4 border border-gray-200 rounded-lg shadow-sm">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            {tableHeaders.length > 0 && (
              <thead className="bg-gray-50">
                <tr>
                  {tableHeaders.map((header, idx) => (
                    <th key={idx} className="px-4 py-2.5 text-right font-semibold text-gray-700">
                      {renderInlineFormatting(header)}
                    </th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody className="divide-y divide-gray-200 bg-white">
              {tableRows.map((row, rIdx) => (
                <tr key={rIdx} className={rIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                  {row.map((cell, cIdx) => (
                    <td key={cIdx} className="px-4 py-2 text-gray-800 text-right">
                      {renderInlineFormatting(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      inTable = false;
      tableHeaders = [];
      tableRows = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Code block boundary
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        inCodeBlock = false;
        flushCodeBlock(`code-${i}`);
      } else {
        if (inTable) flushTable(`table-before-code-${i}`);
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockLines.push(line);
      continue;
    }

    // Markdown Table handling
    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      const cells = line
        .trim()
        .split('|')
        .slice(1, -1)
        .map((c) => c.trim());

      // Check if separator line (|---|---|)
      const isSeparator = cells.every((c) => /^:?-+:?$/.test(c));
      if (isSeparator) {
        // Just header separator, skip
        continue;
      }

      if (!inTable) {
        inTable = true;
        tableHeaders = cells;
      } else {
        tableRows.push(cells);
      }
      continue;
    } else if (inTable) {
      flushTable(`table-${i}`);
    }

    // Headings
    if (line.startsWith('#### ')) {
      elements.push(
        <h4 key={`h4-${i}`} className="text-base font-bold text-gray-900 mt-4 mb-1">
          {renderInlineFormatting(line.slice(5))}
        </h4>
      );
      continue;
    }
    if (line.startsWith('### ')) {
      elements.push(
        <h3 key={`h3-${i}`} className="text-lg font-bold text-gray-900 mt-5 mb-2 pb-1 border-b border-gray-100">
          {renderInlineFormatting(line.slice(4))}
        </h3>
      );
      continue;
    }
    if (line.startsWith('## ')) {
      elements.push(
        <h2 key={`h2-${i}`} className="text-xl font-bold text-gray-900 mt-6 mb-3 pb-1 border-b border-gray-200">
          {renderInlineFormatting(line.slice(3))}
        </h2>
      );
      continue;
    }
    if (line.startsWith('# ')) {
      elements.push(
        <h1 key={`h1-${i}`} className="text-2xl font-black text-gray-900 mt-6 mb-4">
          {renderInlineFormatting(line.slice(2))}
        </h1>
      );
      continue;
    }

    // Blockquotes
    if (line.startsWith('> ')) {
      elements.push(
        <blockquote key={`bq-${i}`} className="border-r-4 border-amber-500 bg-amber-50/60 pr-4 pl-3 py-2.5 rounded-l-md text-amber-900 my-2 text-sm">
          {renderInlineFormatting(line.slice(2))}
        </blockquote>
      );
      continue;
    }

    // List items
    if (/^[\*\-]\s+/.test(line.trim())) {
      const listContent = line.trim().replace(/^[\*\-]\s+/, '');
      elements.push(
        <div key={`li-${i}`} className="flex items-start gap-2 my-1 text-sm text-gray-800 pr-2">
          <span className="text-teal-600 font-bold mt-0.5">•</span>
          <span>{renderInlineFormatting(listContent)}</span>
        </div>
      );
      continue;
    }

    if (/^\d+\.\s+/.test(line.trim())) {
      const match = /^(\d+)\.\s+(.+)$/.exec(line.trim());
      if (match) {
        elements.push(
          <div key={`oli-${i}`} className="flex items-start gap-2 my-1 text-sm text-gray-800 pr-2">
            <span className="text-gray-500 font-semibold font-mono text-xs mt-0.5 min-w-[1.2rem]">{match[1]}.</span>
            <span>{renderInlineFormatting(match[2])}</span>
          </div>
        );
        continue;
      }
    }

    // Empty line
    if (!line.trim()) {
      continue;
    }

    // Regular paragraph
    elements.push(
      <p key={`p-${i}`} className="text-sm leading-7 text-gray-800 my-2">
        {renderInlineFormatting(line)}
      </p>
    );
  }

  if (inCodeBlock) flushCodeBlock('code-end');
  if (inTable) flushTable('table-end');

  return <div className={`safe-markdown leading-relaxed space-y-1 ${className}`}>{elements}</div>;
};

function renderInlineFormatting(text: string): React.ReactNode {
  if (!text) return null;

  // Split by bold (**text**) or inline code (`code`)
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith('**') && token.endsWith('**')) {
      parts.push(
        <strong key={match.index} className="font-semibold text-gray-900">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith('`') && token.endsWith('`')) {
      parts.push(
        <code key={match.index} className="bg-gray-100 text-rose-700 px-1.5 py-0.5 rounded text-xs font-mono font-medium">
          {token.slice(1, -1)}
        </code>
      );
    }
    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts.length > 0 ? parts : text;
}
