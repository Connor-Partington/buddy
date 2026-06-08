import * as vscode from 'vscode';

export const careSettingsSection = 'buddy.care';

export type BuddyCareSettings = {
  heartDrainIntervalMinutes: number;
  breakPromptIntervalMinutes: number;
  xpMultiplier: number;
  deathPenaltyPercent: number;
  canDie: boolean;
};

export const defaultBuddyCareSettings: BuddyCareSettings = {
  heartDrainIntervalMinutes: 180,
  breakPromptIntervalMinutes: 25,
  xpMultiplier: 1,
  deathPenaltyPercent: 25,
  canDie: true,
};

export function getBuddyCareSettings(): BuddyCareSettings {
  const configuration = vscode.workspace.getConfiguration(careSettingsSection);

  return {
    heartDrainIntervalMinutes: normalizePositiveNumber(
      configuration.get<number>('heartDrainIntervalMinutes'),
      defaultBuddyCareSettings.heartDrainIntervalMinutes,
    ),
    breakPromptIntervalMinutes: normalizePositiveNumber(
      configuration.get<number>('breakPromptIntervalMinutes'),
      defaultBuddyCareSettings.breakPromptIntervalMinutes,
    ),
    xpMultiplier: normalizePositiveNumber(
      configuration.get<number>('xpMultiplier'),
      defaultBuddyCareSettings.xpMultiplier,
    ),
    deathPenaltyPercent: normalizePercent(
      configuration.get<number>('deathPenaltyPercent'),
      defaultBuddyCareSettings.deathPenaltyPercent,
    ),
    canDie: configuration.get<boolean>('canDie', defaultBuddyCareSettings.canDie),
  };
}

export function getHeartDrainIntervalMs(settings: BuddyCareSettings): number {
  return Math.max(60 * 1000, Math.round(settings.heartDrainIntervalMinutes * 60 * 1000));
}

export function getBreakPromptIntervalMs(settings: BuddyCareSettings): number {
  return Math.max(60 * 1000, Math.round(settings.breakPromptIntervalMinutes * 60 * 1000));
}

function normalizePositiveNumber(value: number | undefined, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    return fallback;
  }

  return value;
}

function normalizePercent(value: number | undefined, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.min(100, Math.max(0, value));
}
