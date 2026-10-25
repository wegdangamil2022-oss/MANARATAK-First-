import { FileText, Image, Film, Headphones, ClipboardCheck } from 'lucide-react';
import type { CourseContentBlockInput, CourseCurriculumSnapshotDto } from '@manaratak/domain';
import { useCourseCopy } from './useCourseCopy';

/** The draft is rendered as escaped structured content. Protected media is labelled,
 * never converted into a public URL or a pretend player. */
export function NativeLessonBlockPreview({
  blocks,
  snapshot,
}: {
  blocks: CourseContentBlockInput[];
  snapshot: CourseCurriculumSnapshotDto;
}) {
  const { tr } = useCourseCopy();
  return (
    <div
      className="native-block-preview"
      aria-label={tr('معاينة كتل المحاضرة', 'Lecture block preview')}
    >
      {blocks.map((block) => {
        const text = String(block.payload.text ?? '');
        const attachment = snapshot.assets.find((asset) => asset.id === block.assetReferenceId);
        const Icon =
          block.type === 'IMAGE'
            ? Image
            : block.type === 'VIDEO'
              ? Film
              : block.type === 'AUDIO'
                ? Headphones
                : block.type === 'QUIZ'
                  ? ClipboardCheck
                  : FileText;
        return (
          <section key={block.id} dir="auto">
            {block.type === 'HEADING' ? (
              <h4>{text}</h4>
            ) : block.type === 'TEXT' ? (
              block.payload.format === 'BULLETS' ? (
                <ul>
                  {text.split('\n').map((line, index) => (
                    <li key={index}>{line}</li>
                  ))}
                </ul>
              ) : block.payload.format === 'NUMBERED' ? (
                <ol>
                  {text.split('\n').map((line, index) => (
                    <li key={index}>{line}</li>
                  ))}
                </ol>
              ) : (
                <p>{text}</p>
              )
            ) : block.type === 'CODE' ? (
              <pre dir="ltr">
                <code>{text}</code>
              </pre>
            ) : block.type === 'TABLE' ? (
              <div className="course-table-region">
                <table>
                  <tbody>
                    {((block.payload.rows as string[][]) ?? []).map((row, index) => (
                      <tr key={index}>
                        {row.map((cell, column) =>
                          index === 0 ? (
                            <th key={column} scope="col">
                              {cell}
                            </th>
                          ) : (
                            <td key={column}>{cell}</td>
                          ),
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : block.type === 'LINK' ? (
              <p>
                <strong>{String(block.payload.title ?? '')}</strong>
                <br />
                <span dir="ltr">{String(block.payload.url ?? '')}</span>
              </p>
            ) : (
              <p>
                <Icon size={18} />
                <strong>
                  {String(block.payload.title ?? block.payload.alt ?? '') ||
                    attachment?.title ||
                    snapshot.quizzes.find((quiz) => quiz.id === block.quizId)?.title ||
                    tr('مرجع لم يحدد', 'Reference not selected')}
                </strong>
                {attachment && (
                  <small>
                    {tr(
                      'ملف محمي — التسليم من غرفة الطالب بعد التحقق من الإذن',
                      'Protected attachment — delivered by the learning room after authorization',
                    )}
                  </small>
                )}
                {Boolean(block.payload.caption) && <small>{String(block.payload.caption)}</small>}
              </p>
            )}
          </section>
        );
      })}
    </div>
  );
}
