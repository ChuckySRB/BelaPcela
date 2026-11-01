import type { FamilyArchive, Person } from '../domain/model';
import { initials, personLabel } from '../domain/people';
import { MediaImage } from '../features/media/MediaContext';

export function Portrait({ person, archive, className = '' }: { person: Person; archive: FamilyArchive; className?: string }) {
  const media = archive.media.find(media => media.id === person.preferredMediaId);
  return <div className={`portrait ${className}`}>
    {media && (!media.mimeType || media.mimeType.startsWith('image/'))
      ? <MediaImage media={media} alt={media.alt || personLabel(person)} />
      : <div className="portrait-monogram" role="img" aria-label={`Монограм: ${personLabel(person)}`}>
        <svg className="portrait-botanical" viewBox="0 0 120 150" fill="none" aria-hidden="true">
          <path d="M13 144C34 112 29 78 22 34m7 68C9 100 8 85 8 85c14 0 21 11 21 17Zm0-26C11 74 12 60 12 60c13 1 17 11 17 16ZM25 54C8 49 14 36 14 36c11 4 13 12 11 18ZM107 144c-21-32-16-66-9-110m-7 68c20-2 21-17 21-17-14 0-21 11-21 17Zm0-26c18-2 17-16 17-16-13 1-17 11-17 16Zm4-22c17-5 11-18 11-18-11 4-13 12-11 18Z" stroke="currentColor" />
        </svg>
        <span>{initials(person)}</span>
        <span className="portrait-monogram-rule" />
      </div>}
  </div>;
}
