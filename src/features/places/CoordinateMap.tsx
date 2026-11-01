import type { Place } from '../../domain/model';
import { recordHref } from '../../app/CatalogContext';

export function CoordinateMap({ places = [], value, onChange }: { places?: Place[]; value?: Place['coordinates']; onChange?: (value: NonNullable<Place['coordinates']>) => void }) {
  const graphic = <svg viewBox="0 0 720 360" role="img" aria-label="Географска мрежа координата без интернет подлоге">
    <rect width="720" height="360" className="coordinate-surface" />
    {[-120, -60, 0, 60, 120].map(longitude => <g key={longitude}><path d={`M${(longitude + 180) * 2} 0V360`} /><text x={(longitude + 180) * 2 + 4} y={16}>{longitude}°</text></g>)}
    {[-60, -30, 0, 30, 60].map(latitude => <g key={latitude}><path d={`M0 ${(90 - latitude) * 2}H720`} /><text x={5} y={(90 - latitude) * 2 - 5}>{latitude}°</text></g>)}
    {places.filter(place => place.coordinates).map(place => <a key={place.id} href={recordHref('place', place.id)} aria-label={`Место: ${place.name}`}><circle className="coordinate-hit" cx={(place.coordinates!.longitude + 180) * 2} cy={(90 - place.coordinates!.latitude) * 2} r={22} /><circle className="coordinate-point" cx={(place.coordinates!.longitude + 180) * 2} cy={(90 - place.coordinates!.latitude) * 2} r={6} /><title>{place.name}</title></a>)}
    {value && <circle className="coordinate-point is-selected" cx={(value.longitude + 180) * 2} cy={(90 - value.latitude) * 2} r={7} />}
  </svg>;
  return <div className="coordinate-map">
    {onChange ? <button type="button" className="coordinate-picker" aria-label={`Избор координата. ${value ? `${value.latitude}, ${value.longitude}.` : ''} Кликните на мрежу или користите стрелице.`}
      onKeyDown={event => {
        if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) return;
        event.preventDefault(); const step = event.shiftKey ? 10 : 1;
        onChange({ latitude: Math.max(-90, Math.min(90, (value?.latitude || 0) + (event.key === 'ArrowUp' ? step : event.key === 'ArrowDown' ? -step : 0))), longitude: Math.max(-180, Math.min(180, (value?.longitude || 0) + (event.key === 'ArrowRight' ? step : event.key === 'ArrowLeft' ? -step : 0))) });
      }} onClick={event => {
        if (!event.detail) { onChange(value || { latitude: 0, longitude: 0 }); return; }
        const bounds = event.currentTarget.getBoundingClientRect();
        onChange({ latitude: Number((90 - (event.clientY - bounds.top) / bounds.height * 180).toFixed(5)), longitude: Number(((event.clientX - bounds.left) / bounds.width * 360 - 180).toFixed(5)) });
      }}>{graphic}</button> : graphic}
    <p className="prototype-note">Географска мрежа · без интернет подлоге. Координате нису обавезне.</p>
  </div>;
}
