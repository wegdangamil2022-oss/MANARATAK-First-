import type { ReactNode } from 'react';
import type { CourseContentBlockDto } from '@manaratak/domain';
type Block = Omit<CourseContentBlockDto, 'courseId' | 'status'>;
export function CourseLessonBlocks({
  blocks,
  busy,
  onAsset,
  onQuiz,
  media,
}: {
  blocks: Block[];
  busy: boolean;
  onAsset: (referenceId: string, title: string, subtitle?: { id: string; language: string }) => void;
  onQuiz: (quizId: string) => void;
  media?: (block: Block) => ReactNode;
}) {
  return (
    <div className="mt-4 space-y-4" data-course-content-blocks>
      {blocks.map((block) => {
        const p = block.payload,
          text = String(p.text ?? ''),
          title = String(p.title ?? p.alt ?? block.type);
        return (
          <section
            key={block.id}
            data-block-id={block.id}
            dir="auto"
            className="min-w-0 break-words"
          >
            {block.type === 'TEXT' ? (
              p.format === 'BULLETS' || p.format === 'NUMBERED' ? (
                p.format === 'BULLETS' ? (
                  <ul className="list-disc ps-6 text-sm leading-7">
                    {text.split('\n').map((line, i) => (
                      <li key={i}>{line}</li>
                    ))}
                  </ul>
                ) : (
                  <ol className="list-decimal ps-6 text-sm leading-7">
                    {text.split('\n').map((line, i) => (
                      <li key={i}>{line}</li>
                    ))}
                  </ol>
                )
              ) : (
                <p className="whitespace-pre-wrap text-sm leading-7">{text}</p>
              )
            ) : block.type === 'HEADING' ? (
              <h4 className="text-base font-bold">{text}</h4>
            ) : block.type === 'CODE' ? (
              <pre
                dir="ltr"
                className="max-w-full overflow-auto rounded-xl bg-slate-900 p-4 text-sm text-white"
              >
                <code>{text}</code>
              </pre>
            ) : block.type === 'TABLE' ? (
              <div className="max-w-full overflow-auto" tabIndex={0}>
                <table className="w-full border-collapse text-sm">
                  <tbody>
                    {(p.rows as string[][]).map((row, i) => (
                      <tr key={i}>
                        {row.map((cell, j) =>
                          i === 0 ? (
                            <th scope="col" className="border p-2" key={j}>
                              {cell}
                            </th>
                          ) : (
                            <td className="border p-2" key={j}>
                              {cell}
                            </td>
                          ),
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : block.type === 'LINK' ? (
              <a
                className="font-bold text-teal-700 underline"
                href={String(p.url)}
                rel="noopener noreferrer"
                target="_blank"
              >
                {title}
              </a>
            ) : block.type === 'QUIZ' ? (
              <button
                type="button"
                disabled={busy}
                className="rounded-xl border px-4 py-2 text-sm font-bold"
                onClick={() => onQuiz(block.quizId!)}
              >
                {title === 'QUIZ' ? 'الاختبار / Assessment' : title}
              </button>
            ) : (
              <figure>
                <button
                  type="button"
                  disabled={busy}
                  className="rounded-xl border px-4 py-2 text-sm font-bold"
                  onClick={() => onAsset(block.assetReferenceId!, title, block.type === 'VIDEO' && p.subtitleReferenceId ? { id: String(p.subtitleReferenceId), language: String(p.subtitleLanguage) } : undefined)}
                >
                  {title}
                </button>
                {media?.(block)}
                {Boolean(p.caption) && (
                  <figcaption className="mt-2 text-sm">{String(p.caption)}</figcaption>
                )}
              </figure>
            )}
          </section>
        );
      })}
    </div>
  );
}
