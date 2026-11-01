export type DetailLevel = 'near' | 'medium' | 'far';
export const detailLevel = (zoom: number): DetailLevel => zoom < 0.45 ? 'far' : zoom < 0.8 ? 'medium' : 'near';
export function shortName(name: string) {
  const parts = name.trim().split(/\s+/);
  return parts.length > 1 ? `${parts[0]} ${Array.from(parts.at(-1)!)[0]}.` : name;
}
