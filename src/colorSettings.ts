export const buddyColorPresets = [
  { id: 'green', label: 'Buddy green', rotation: 0 },
  { id: 'mint', label: 'Mint', rotation: 55 },
  { id: 'sky', label: 'Sky blue', rotation: 110 },
  { id: 'blue', label: 'Blue', rotation: 145 },
  { id: 'purple', label: 'Purple', rotation: 190 },
  { id: 'pink', label: 'Pink', rotation: 240 },
  { id: 'red', label: 'Red', rotation: 275 },
  { id: 'orange', label: 'Orange', rotation: 305 },
  { id: 'gold', label: 'Gold', rotation: 325 },
] as const;
export type BuddyColorId = (typeof buddyColorPresets)[number]['id'];
export type BuddyColors = { buddy: BuddyColorId; partner: BuddyColorId; children: BuddyColorId };
export const buddyColorsKey = 'buddyColors';
export const defaultBuddyColors: BuddyColors = { buddy: 'green', partner: 'sky', children: 'green' };

export function normalizeBuddyColors(value: Partial<BuddyColors> | undefined): BuddyColors {
  const color = (id: unknown, fallback: BuddyColorId): BuddyColorId =>
    buddyColorPresets.find((preset) => preset.id === id)?.id ?? fallback;
  return {
    buddy: color(value?.buddy, defaultBuddyColors.buddy),
    partner: color(value?.partner, defaultBuddyColors.partner),
    children: color(value?.children, defaultBuddyColors.children),
  };
}
