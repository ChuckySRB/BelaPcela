import { describe, expect, it } from 'vitest';

function luminance(hex: string) {
  const channels = hex.match(/[a-f\d]{2}/gi)!.map(channel => parseInt(channel, 16) / 255).map(channel => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
  return channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722;
}
function contrast(a: string, b: string) {
  const values = [luminance(a), luminance(b)].sort((a, b) => b - a);
  return (values[0] + .05) / (values[1] + .05);
}

describe('functional text contrast (WCAG AA)', () => {
  it.each([
    ['primary text on paper', '#273C30', '#F7F3EA'],
    ['muted text on paper', '#675F52', '#F7F3EA'],
    ['muted text on card', '#675F52', '#FFFCF5'],
    ['primary button', '#FFFCF5', '#244B3A'],
    ['brass label on paper', '#795d2f', '#F7F3EA'],
    ['prototype banner', '#625333', '#EEE7D8'],
    ['active navigation', '#244B3A', '#F4F0E6'],
    ['dark primary text', '#f1eddf', '#142c23'],
    ['dark secondary text', '#c3c9b7', '#1c372c'],
    ['dark primary button', '#173b2e', '#eee9d8'],
    ['dark brass labels', '#dec48f', '#142c23'],
  ])('%s', (_label, foreground, background) => {
    expect(contrast(foreground, background)).toBeGreaterThanOrEqual(4.5);
  });
});
