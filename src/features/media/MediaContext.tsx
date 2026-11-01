import { createContext, useContext, useEffect, useRef, useState, type RefObject } from 'react';
import type { Media } from '../../domain/model';

export type MediaLoader = (id: string, variant: 'original' | 'thumbnail') => Promise<Blob | undefined>;
export const MediaContext = createContext<MediaLoader | null>(null);
export function useObjectUrl(media: Media, variant: 'original' | 'thumbnail', enabled = true) {
  const loader = useContext(MediaContext); const [state, setState] = useState<{ url?: string; missing: boolean }>({ missing: false });
  useEffect(() => {
    let cancelled = false; let url: string | undefined;
    setState({ missing: false });
    if (enabled) void (async () => {
      try {
        const blob = await loader?.(media.id, variant);
        if (cancelled) return;
        url = blob ? URL.createObjectURL(blob) : undefined;
        const legacy = media.src && (/^data:image\/(?:png|jpeg|gif|webp);base64,/.test(media.src) || /^\.?\/?(?:assets|photos)\//.test(media.src)) ? media.src : undefined;
        setState({ url: url || legacy, missing: !url && !legacy });
      } catch { if (!cancelled) setState({ missing: true }); }
    })();
    return () => { cancelled = true; if (url) URL.revokeObjectURL(url); };
  }, [loader, media.id, media.src, variant, enabled]);
  return state;
}
function useOnScreen(ref: RefObject<HTMLElement | null>) {
  const [visible, setVisible] = useState(typeof IntersectionObserver === 'undefined');
  useEffect(() => {
    if (!ref.current || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(entries => setVisible(entries.some(entry => entry.isIntersecting)), { rootMargin: '160px' });
    observer.observe(ref.current); return () => observer.disconnect();
  }, [ref]);
  return visible;
}
export function MediaImage({ media, alt, className = '' }: { media: Media; alt?: string; className?: string }) {
  const container = useRef<HTMLSpanElement>(null); const visible = useOnScreen(container);
  const { url, missing } = useObjectUrl(media, 'thumbnail', visible);
  return <span ref={container} className={`media-image ${className}`}>
    {url ? <img src={url} alt={alt || media.alt || media.title || 'Фотографија'} loading="lazy" /> : <span className="media-image-status" role="img" aria-label={missing ? 'Датотека није доступна' : 'Фотографија се учитава'}>{missing ? 'Датотека није доступна' : '·'}</span>}
  </span>;
}
