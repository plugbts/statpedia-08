// GitHub synchronization service for real-time code updates
import { syncService } from './sync-service';

interface GitHubConfig {
  repository: string;
  branch: string;
  accessToken?: string;
  webhookSecret?: string;
  syncInterval: number; // in milliseconds
  autoCommit: boolean;
  autoPush: boolean;
}

interface GitHubFileChange {
  path: string;
  content: string;
  action: 'created' | 'modified' | 'deleted';
  timestamp: number;
  commitHash?: string;
}

class GitHubSyncService {
  private config: GitHubConfig;
  private isWatching = false;
  private watchInterval: NodeJS.Timeout | null = null;
  private lastCommitHash: string | null = null;
  private fileWatchers: Map<string, any> = new Map();

  constructor(config: Partial<GitHubConfig> = {}) {
    this.config = {
      repository: 'statpedia-08', // Default repository name
      branch: 'main',
      syncInterval: 30000, // 30 seconds
      autoCommit: true,
      autoPush: true,
      ...config,
    };
  }

  async startWatching(): Promise<void> {
    if (this.isWatching) {
      console.log('GitHub sync is already running');
      return;
    }

    try {
      console.log('Starting GitHub synchronization...');
      
      // Get initial commit hash
      await this.updateLastCommitHash();
      
      // Start polling for changes
      this.watchInterval = setInterval(async () => {
        await this.checkForUpdates();
      }, this.config.syncInterval);

      // Start file system watching
      await this.startFileSystemWatching();

      this.isWatching = true;
      console.log('GitHub sync started successfully');
      
      // Sync initial state
      await this.syncToGitHub();
      
    } catch (error) {
      console.error('Failed to start GitHub sync:', error);
      throw error;
    }
  }

  async stopWatching(): Promise<void> {
    if (!this.isWatching) {
      return;
    }

    if (this.watchInterval) {
      clearInterval(this.watchInterval);
      this.watchInterval = null;
    }

    // Stop file system watchers
    this.fileWatchers.forEach(watcher => watcher.close());
    this.fileWatchers.clear();

    this.isWatching = false;
    console.log('GitHub sync stopped');
  }

  private async updateLastCommitHash(): Promise<void> {
    try {
      const response = await fetch(
        `https://api.github.com/repos/${this.config.repository}/commits/${this.config.branch}`,
        {
          headers: {
            'Authorization': this.config.accessToken ? `token ${this.config.accessToken}` : '',
            'Accept': 'application/vnd.github.v3+json',
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        this.lastCommitHash = data.sha;
        console.log('Updated last commit hash:', this.lastCommitHash);
      }
    } catch (error) {
      console.error('Failed to update commit hash:', error);
    }
  }

  private async checkForUpdates(): Promise<void> {
    try {
      const response = await fetch(
        `https://api.github.com/repos/${this.config.repository}/commits/${this.config.branch}`,
        {
          headers: {
            'Authorization': this.config.accessToken ? `token ${this.config.accessToken}` : '',
            'Accept': 'application/vnd.github.v3+json',
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        const currentCommitHash = data.sha;

        if (this.lastCommitHash && currentCommitHash !== this.lastCommitHash) {
          console.log('New commit detected:', currentCommitHash);
          await this.pullChanges();
          this.lastCommitHash = currentCommitHash;
        }
      }
    } catch (error) {
      console.error('Failed to check for updates:', error);
    }
  }

  private async pullChanges(): Promise<void> {
    try {
      console.log('Pulling changes from GitHub...');
      
      // Execute git pull
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);

      const { stdout, stderr } = await execAsync('git pull origin main');
      
      if (stderr && !stderr.includes('Already up to date')) {
        console.log('Git pull output:', stdout);
        console.log('Git pull errors:', stderr);
      }

      // Notify sync service about the update
      syncService.syncCode({
        type: 'github-pull',
        timestamp: Date.now(),
        message: 'Code updated from GitHub',
      });

      console.log('Successfully pulled changes from GitHub');
    } catch (error) {
      console.error('Failed to pull changes:', error);
    }
  }

  private async startFileSystemWatching(): Promise<void> {
    try {
      const chokidar = await import('chokidar');
      
      // Watch for file changes in src directory
      const watcher = chokidar.watch('src/**/*', {
        ignored: /(^|[\/\\])\../, // ignore dotfiles
        persistent: true,
        ignoreInitial: true,
      });

      watcher.on('change', async (path) => {
        console.log('File changed:', path);
        await this.handleFileChange(path, 'modified');
      });

      watcher.on('add', async (path) => {
        console.log('File added:', path);
        await this.handleFileChange(path, 'created');
      });

      watcher.on('unlink', async (path) => {
        console.log('File deleted:', path);
        await this.handleFileChange(path, 'deleted');
      });

      this.fileWatchers.set('src', watcher);
      console.log('File system watching started for src directory');
    } catch (error) {
      console.error('Failed to start file system watching:', error);
      // Fallback to basic polling if chokidar is not available
      console.log('Using fallback polling method');
    }
  }

  private async handleFileChange(path: string, action: 'created' | 'modified' | 'deleted'): Promise<void> {
    try {
      const fileChange: GitHubFileChange = {
        path,
        action,
        timestamp: Date.now(),
      };

      // Read file content if it exists
      if (action !== 'deleted') {
        try {
          const fs = await import('fs/promises');
          fileChange.content = await fs.readFile(path, 'utf-8');
        } catch (error) {
          console.error('Failed to read file content:', error);
        }
      }

      // Sync to GitHub if auto-commit is enabled
      if (this.config.autoCommit) {
        await this.syncToGitHub();
      }

      // Notify sync service
      syncService.syncCode({
        type: 'file-change',
        fileChange,
        timestamp: Date.now(),
      });

    } catch (error) {
      console.error('Failed to handle file change:', error);
    }
  }

  private async syncToGitHub(): Promise<void> {
    try {
      if (!this.config.autoCommit) {
        return;
      }

      console.log('Syncing changes to GitHub...');
      
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);

      // Add all changes
      await execAsync('git add .');
      
      // Check if there are changes to commit
      const { stdout: statusOutput } = await execAsync('git status --porcelain');
      
      if (statusOutput.trim()) {
        // Commit changes
        const commitMessage = `Auto-sync: ${new Date().toISOString()}`;
        await execAsync(`git commit -m "${commitMessage}"`);
        
        // Push changes if auto-push is enabled
        if (this.config.autoPush) {
          await execAsync('git push origin main');
          console.log('Changes pushed to GitHub');
        }
        
        console.log('Changes committed to local repository');
      } else {
        console.log('No changes to commit');
      }

    } catch (error) {
      console.error('Failed to sync to GitHub:', error);
    }
  }

  // Public API methods
  public async forceSync(): Promise<void> {
    await this.syncToGitHub();
  }

  public async forcePull(): Promise<void> {
    await this.pullChanges();
  }

  public getStatus() {
    return {
      isWatching: this.isWatching,
      lastCommitHash: this.lastCommitHash,
      config: this.config,
    };
  }

  public updateConfig(newConfig: Partial<GitHubConfig>) {
    this.config = { ...this.config, ...newConfig };
  }
}

// Create and export the GitHub sync service instance
export const githubSyncService = new GitHubSyncService({
  repository: 'statpedia-08',
  branch: 'main',
  syncInterval: 30000, // 30 seconds
  autoCommit: true,
  autoPush: true,
});

export default githubSyncService;
