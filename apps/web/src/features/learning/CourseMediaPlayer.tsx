export interface LearningMedia {
  url: string;
  type: 'video' | 'audio' | 'image';
  title: string;
  referenceId: string;
  subtitleUrl?: string;
  subtitleLanguage?: string;
}
export function CourseMediaPlayer({
  media,
  alt,
  onError,
}: {
  media: LearningMedia;
  alt?: string;
  onError: () => void;
}) {
  return media.type === 'video' ? (
    <video
      className="mt-3 w-full max-h-[70vh]"
      controls
      preload="metadata"
      src={media.url}
      aria-label={media.title}
      onError={onError}
    >
      {media.subtitleUrl && (
        <track
          kind="subtitles"
          default
          src={media.subtitleUrl}
          srcLang={media.subtitleLanguage ?? 'ar'}
          label={media.subtitleLanguage ?? 'ar'}
        />
      )}
    </video>
  ) : media.type === 'audio' ? (
    <audio
      className="mt-3 w-full"
      controls
      preload="metadata"
      src={media.url}
      aria-label={media.title}
      onError={onError}
    />
  ) : (
    <img
      className="mt-3 max-w-full max-h-[70vh] mx-auto"
      src={media.url}
      alt={alt ?? media.title}
      onError={onError}
    />
  );
}
