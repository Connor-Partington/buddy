import type * as vscode from 'vscode';

export const maxBuddyChildren = 4;
export type BuddyFamily = { hasPartner: boolean; children: number };
export type BuddyFamilyAction = 'spawnPartner' | 'haveChild' | 'clearFamily';
const familyKey = 'buddyFamily';

export class BuddyFamilyManager {
  private current: BuddyFamily;

  public constructor(private readonly storage: vscode.Memento) {
    const saved = storage.get<Partial<BuddyFamily>>(familyKey);
    const children = saved?.children;
    this.current = {
      hasPartner: saved?.hasPartner === true,
      children: saved?.hasPartner === true && typeof children === 'number' && Number.isFinite(children)
        ? Math.min(maxBuddyChildren, Math.max(0, Math.floor(children))) : 0,
    };
  }

  public get family(): BuddyFamily {
    return { ...this.current };
  }

  public async apply(action: BuddyFamilyAction): Promise<void> {
    if (action === 'clearFamily') {
      this.current = { hasPartner: false, children: 0 };
    } else if (action === 'spawnPartner') {
      this.current = { ...this.current, hasPartner: true };
    } else if (this.current.hasPartner && this.current.children < maxBuddyChildren) {
      this.current = { ...this.current, children: this.current.children + 1 };
    }
    await this.storage.update(familyKey, this.family);
  }
}
