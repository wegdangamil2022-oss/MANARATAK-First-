import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Eye, LockKeyhole } from 'lucide-react';
import { ApiClient, type CoursePublicPreviewDto } from '../../api/client';
import { CourseLessonBlocks } from './CourseLessonBlocks';
import { CourseMediaPlayer, type LearningMedia } from './CourseMediaPlayer';
import { fetchCourseMediaBlob } from './course-media-delivery';
import './course-learner.css';

export function CoursePublicPreviewPage() {
  const { slug = '', locale = 'ar' } = useParams();
  const ar = locale === 'ar';
  const [data, setData] = useState<CoursePublicPreviewDto>();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [media, setMedia] = useState<LearningMedia | null>(null);
  const request = useRef(0);
  useEffect(() => {
    const id = ++request.current;
    setData(undefined);
    setError('');
    setMedia(null);
    void ApiClient.getCoursePublicPreview(slug)
      .then((value) => {
        if (id === request.current) setData(value);
      })
      .catch(() => {
        if (id === request.current) setError(ar ? 'المعاينة غير متاحة.' : 'Preview unavailable.');
      });
    return () => {
      ++request.current;
    };
  }, [slug, ar]);
  useEffect(
    () => () => {
      if (media) {
        URL.revokeObjectURL(media.url);
        if (media.subtitleUrl) URL.revokeObjectURL(media.subtitleUrl);
      }
    },
    [media],
  );
  async function open(
    lessonId: string,
    id: string,
    title: string,
    subtitle?: { id: string; language: string },
  ) {
    setBusy(true);
    setError('');
    const generation = request.current;
    try {
      const blob = await fetchCourseMediaBlob(
        await ApiClient.getCoursePublicPreviewGrant(slug, lessonId, id),
      );
      let subtitleBlob: Blob | undefined;
      if (subtitle)
        subtitleBlob = await fetchCourseMediaBlob(
          await ApiClient.getCoursePublicPreviewGrant(slug, lessonId, subtitle.id),
          2 * 1024 * 1024,
        );
      if (generation !== request.current) return;
      const url = URL.createObjectURL(blob),
        type = blob.type.startsWith('video/')
          ? 'video'
          : blob.type.startsWith('audio/')
            ? 'audio'
            : blob.type.startsWith('image/')
              ? 'image'
              : null;
      if (type)
        setMedia({
          url,
          type,
          title,
          referenceId: id,
          ...(subtitleBlob
            ? {
                subtitleUrl: URL.createObjectURL(new Blob([subtitleBlob], { type: 'text/vtt' })),
                subtitleLanguage: subtitle?.language,
              }
            : {}),
        });
      else {
        const link = document.createElement('a');
        link.href = url;
        link.download = title;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 60000);
      }
    } catch {
      setError(
        ar
          ? 'تعذر فتح المعاينة؛ تحقق من حقوق الملف وإتاحته.'
          : 'Preview delivery unavailable; check file rights and availability.',
      );
    } finally {
      if (generation === request.current) setBusy(false);
    }
  }
  return (
    <main
      className="mn-course-learner mn-page-shell mx-auto max-w-4xl space-y-4 py-6"
      dir={ar ? 'rtl' : 'ltr'}
    >
      {error && <p role="alert">{error}</p>}
      {!data && !error && <p role="status">{ar ? 'جارٍ تحميل المعاينة…' : 'Loading preview…'}</p>}
      {data && (
        <>
          <header className="mn-card rounded-2xl p-5">
            <h1 className="text-[22px] font-bold">
              <Eye size={20} />
              {data.course.displayName}
            </h1>
            <p className="mt-3 whitespace-pre-wrap text-sm">{data.course.description}</p>
            {Array.isArray(data.course.learningOutcomes) && (
              <ul className="my-3 list-disc ps-5 text-sm">
                {data.course.learningOutcomes.map((row, index) => (
                  <li key={index}>{String(row)}</li>
                ))}
              </ul>
            )}
            <Link
              className="mt-3 inline-flex rounded-xl bg-[#142B5F] px-4 py-2 text-sm font-bold text-white"
              to={`/${locale}/student/courses/${data.course.id}`}
            >
              {ar ? 'التسجيل ومتابعة التعلم' : 'Enroll and continue learning'}
            </Link>
          </header>
          {data.curriculum.modules.map((module) => (
            <section className="mn-card rounded-2xl p-5" key={module.id}>
              <h2 className="text-base font-bold">{module.title}</h2>
              {data.curriculum.lessons
                .filter((row) => row.moduleId === module.id)
                .map((lesson) => (
                  <article className="my-3 rounded-xl border border-[#DDEFF2] p-4" key={lesson.id}>
                    <h3 className="text-sm font-bold">{lesson.title}</h3>
                    {lesson.previewAvailable ? (
                      <>
                        <p className="mt-2 whitespace-pre-wrap text-sm">{lesson.contentText}</p>
                        <CourseLessonBlocks
                          blocks={data.curriculum.contentBlocks.filter(
                            (row) => row.lessonId === lesson.id,
                          )}
                          busy={busy}
                          onQuiz={() => undefined}
                          onAsset={(id, title, subtitle) =>
                            void open(lesson.id, id, title, subtitle)
                          }
                          media={(block) =>
                            media && media.referenceId === block.assetReferenceId ? (
                              <CourseMediaPlayer
                                media={media}
                                onError={() =>
                                  setError(ar ? 'تعذر تشغيل الملف.' : 'Playback failed.')
                                }
                              />
                            ) : null
                          }
                        />
                        {data.curriculum.assets
                          .filter(
                            (row) =>
                              row.lessonId === lesson.id &&
                              !data.curriculum.contentBlocks.some(
                                (block) => block.assetReferenceId === row.id,
                              ),
                          )
                          .map((asset) => (
                            <button
                              key={asset.id}
                              disabled={busy}
                              className="mt-2 rounded-xl border px-3 py-2 text-sm"
                              onClick={() =>
                                void open(lesson.id, asset.id, asset.title ?? lesson.title)
                              }
                            >
                              {asset.title ?? asset.assetType}
                            </button>
                          ))}
                      </>
                    ) : (
                      <p className="mt-2 flex gap-2 text-xs">
                        <LockKeyhole size={18} />
                        {ar
                          ? 'تتاح للمسجلين وفق مواعيد الدورة.'
                          : 'Available to enrolled learners under the release policy.'}
                      </p>
                    )}
                  </article>
                ))}
            </section>
          ))}
        </>
      )}
    </main>
  );
}
