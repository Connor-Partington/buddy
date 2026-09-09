import { pixelBackgroundPresets } from './pixelBackgrounds';
export type BackgroundFit = 'cover' | 'contain' | 'tile';
export type BuddyBackground = {
  kind: 'none' | (typeof pixelBackgroundPresets)[number]['kind'] | 'custom';
  fit: BackgroundFit;
  imageUri?: string;
};
export const backgroundStateKey = 'buddyBackground';

export function normalizeBackground(value: Partial<BuddyBackground> | undefined): BuddyBackground {
  const kind = value?.kind;
  return {
    kind: pixelBackgroundPresets.some((preset) => preset.kind === kind) || (kind === 'custom' && typeof value?.imageUri === 'string') ? kind as BuddyBackground['kind'] : 'none',
    fit: value?.fit === 'contain' || value?.fit === 'tile' ? value.fit : 'cover',
    imageUri: typeof value?.imageUri === 'string' ? value.imageUri : undefined,
  };
}
