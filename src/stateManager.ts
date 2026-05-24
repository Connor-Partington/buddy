export const buddyStates = ['idle', 'typing', 'searching', 'thinking', 'sleeping', 'happy', 'panic'] as const;

export type BuddyState = (typeof buddyStates)[number];

export type BuddyStateMessage = {
  type: 'setState';
  state: BuddyState;
};

const stateLabels: Record<BuddyState, string> = {
  idle: 'Ready when you are.',
  typing: 'Keeping pace with your draft.',
  searching: 'Following your cursor.',
  thinking: 'Thinking through the pause.',
  sleeping: 'Resting until the next edit.',
  happy: 'Nice save.',
  panic: 'Something needs attention.',
};

export class BuddyStateManager {
  private currentState: BuddyState = 'idle';
  private listeners = new Set<(state: BuddyState) => void>();

  public get state(): BuddyState {
    return this.currentState;
  }

  public get label(): string {
    return getBuddyStateLabel(this.currentState);
  }

  public setState(state: BuddyState): void {
    if (state === this.currentState) {
      return;
    }

    this.currentState = state;
    this.listeners.forEach((listener) => listener(state));
  }

  public onDidChangeState(listener: (state: BuddyState) => void): { dispose(): void } {
    this.listeners.add(listener);

    return {
      dispose: () => {
        this.listeners.delete(listener);
      },
    };
  }
}

export function getBuddyStateLabel(state: BuddyState): string {
  return stateLabels[state];
}
