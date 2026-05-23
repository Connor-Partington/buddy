export const docFoxStates = ['idle', 'typing', 'thinking', 'sleeping', 'happy'] as const;

export type DocFoxState = (typeof docFoxStates)[number];

export type DocFoxStateMessage = {
  type: 'setState';
  state: DocFoxState;
};

const stateLabels: Record<DocFoxState, string> = {
  idle: 'Ready for Markdown.',
  typing: 'Keeping pace with your draft.',
  thinking: 'Thinking through the pause.',
  sleeping: 'Resting until the next edit.',
  happy: 'Nice save.',
};

export class DocFoxStateManager {
  private currentState: DocFoxState = 'idle';
  private listeners = new Set<(state: DocFoxState) => void>();

  public get state(): DocFoxState {
    return this.currentState;
  }

  public get label(): string {
    return getDocFoxStateLabel(this.currentState);
  }

  public setState(state: DocFoxState): void {
    if (state === this.currentState) {
      return;
    }

    this.currentState = state;
    this.listeners.forEach((listener) => listener(state));
  }

  public onDidChangeState(listener: (state: DocFoxState) => void): { dispose(): void } {
    this.listeners.add(listener);

    return {
      dispose: () => {
        this.listeners.delete(listener);
      },
    };
  }
}

export function getDocFoxStateLabel(state: DocFoxState): string {
  return stateLabels[state];
}
