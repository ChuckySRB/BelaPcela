import { FileText, Film, Image, Music, Plus } from 'lucide-react';
import type { FamilyArchive, Media, MediaLink } from '../../domain/model';
import { recordHref, useCatalogActions } from '../../app/CatalogContext';
import { MediaImage } from './MediaContext';

export function MediaTypeIcon({ media, size = 28 }: { media: Media; size?: number }) {
  const Icon = media.mimeType?.startsWith('image/') ? Image : media.mimeType?.startsWith('audio/') ? Music : media.mimeType?.startsWith('video/') ? Film : FileText;
  return <Icon size={size} strokeWidth={1.3} />;
}
export const mediaMatchesLink = (media: Media, link: MediaLink) => media.links?.some(item => item.entityId === link.entityId && item.entityType === link.entityType);
export function MediaTiles({ items }: { items: Media[] }) {
  return <div className="media-grid">{items.map(item => <a key={item.id} href={recordHref('media', item.id)} className="media-tile">
    <div className="media-tile-visual">{item.mimeType?.startsWith('image/') || item.src ? <MediaImage media={item} /> : <MediaTypeIcon media={item} size={42} />}</div><div className="media-tile-caption"><h3>{item.title || item.originalFilename || item.alt || 'Датотека'}</h3>{item.tags?.length ? <p>{item.tags.join(' · ')}</p> : null}</div>
  </a>)}</div>;
}
export function MediaGallery({ archive, link }: { archive: FamilyArchive; link: MediaLink }) {
  const actions = useCatalogActions(); const items = archive.media.filter(item => mediaMatchesLink(item, link));
  if (!items.length) return actions ? <div className="gallery-add-empty"><button className="text-button" onClick={() => actions.uploadMedia([link])}><Plus size={16} />Додај фотографију или документ</button></div> : null;
  return <section className="profile-section media-gallery"><div className="section-heading"><h2>Фотографије и датотеке</h2>{actions && <button className="button button--soft" onClick={() => actions.uploadMedia([link])}><Plus size={16} />Додај</button>}</div><MediaTiles items={items} /></section>;
}
