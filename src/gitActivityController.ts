import * as vscode from 'vscode';

import { BuddyXpAward } from './xpManager';

type GitExtension = {
  getAPI(version: 1): GitApi;
};

type GitApi = {
  repositories: GitRepository[];
  onDidOpenRepository: vscode.Event<GitRepository>;
  onDidCloseRepository: vscode.Event<GitRepository>;
};

type GitRepository = {
  rootUri: vscode.Uri;
  state: GitRepositoryState;
};

type GitRepositoryState = {
  HEAD?: {
    commit?: string;
  };
  onDidChange: vscode.Event<void>;
};

const gitCommitXpAwardAmount = 20;

export class BuddyGitActivityController implements vscode.Disposable {
  private readonly subscriptions: vscode.Disposable[] = [];
  private readonly repositorySubscriptions = new Map<string, vscode.Disposable>();
  private readonly headCommits = new Map<string, string | undefined>();

  private constructor(
    gitApi: GitApi,
    private readonly onXpAward: (award: BuddyXpAward) => void,
  ) {
    gitApi.repositories.forEach((repository) => this.watchRepository(repository));
    this.subscriptions.push(
      gitApi.onDidOpenRepository((repository) => {
        this.watchRepository(repository);
      }),
      gitApi.onDidCloseRepository((repository) => {
        this.unwatchRepository(repository);
      }),
    );
  }

  public static async create(onXpAward: (award: BuddyXpAward) => void): Promise<BuddyGitActivityController | undefined> {
    const extension = vscode.extensions.getExtension<GitExtension>('vscode.git');
    if (!extension) {
      return undefined;
    }

    try {
      const gitExtension = extension.isActive ? extension.exports : await extension.activate();
      return new BuddyGitActivityController(gitExtension.getAPI(1), onXpAward);
    } catch {
      return undefined;
    }
  }

  public dispose(): void {
    this.subscriptions.forEach((subscription) => subscription.dispose());
    this.repositorySubscriptions.forEach((subscription) => subscription.dispose());
    this.repositorySubscriptions.clear();
    this.headCommits.clear();
  }

  private watchRepository(repository: GitRepository): void {
    const key = getRepositoryKey(repository);
    if (this.repositorySubscriptions.has(key)) {
      return;
    }

    this.headCommits.set(key, repository.state.HEAD?.commit);
    this.repositorySubscriptions.set(
      key,
      repository.state.onDidChange(() => {
        this.handleRepositoryChange(repository);
      }),
    );
  }

  private unwatchRepository(repository: GitRepository): void {
    const key = getRepositoryKey(repository);
    this.repositorySubscriptions.get(key)?.dispose();
    this.repositorySubscriptions.delete(key);
    this.headCommits.delete(key);
  }

  private handleRepositoryChange(repository: GitRepository): void {
    const key = getRepositoryKey(repository);
    const previousCommit = this.headCommits.get(key);
    const nextCommit = repository.state.HEAD?.commit;
    this.headCommits.set(key, nextCommit);

    if (!previousCommit || !nextCommit || previousCommit === nextCommit) {
      return;
    }

    this.onXpAward({ source: 'gitCommit', amount: gitCommitXpAwardAmount });
  }
}

function getRepositoryKey(repository: GitRepository): string {
  return repository.rootUri.toString();
}
