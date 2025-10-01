#!/usr/bin/env node

/**
 * Git Sync Script
 * Automatically synchronizes local changes with GitHub
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class GitSyncScript {
  constructor() {
    this.repository = 'statpedia-08';
    this.branch = 'main';
    this.autoCommit = true;
    this.autoPush = true;
    this.syncInterval = 30000; // 30 seconds
  }

  async syncToGitHub() {
    try {
      console.log('🔄 Syncing changes to GitHub...');
      
      // Check if there are changes
      const status = execSync('git status --porcelain', { encoding: 'utf8' });
      
      if (!status.trim()) {
        console.log('✅ No changes to commit');
        return;
      }

      // Add all changes
      execSync('git add .', { stdio: 'inherit' });
      console.log('📁 Added all changes to staging');

      // Commit changes
      const commitMessage = `Auto-sync: ${new Date().toISOString()}`;
      execSync(`git commit -m "${commitMessage}"`, { stdio: 'inherit' });
      console.log('💾 Committed changes');

      // Push changes
      if (this.autoPush) {
        execSync('git push origin main', { stdio: 'inherit' });
        console.log('🚀 Pushed changes to GitHub');
      }

      console.log('✅ Sync completed successfully');
    } catch (error) {
      console.error('❌ Sync failed:', error.message);
      throw error;
    }
  }

  async pullFromGitHub() {
    try {
      console.log('🔄 Pulling changes from GitHub...');
      
      // Fetch latest changes
      execSync('git fetch origin', { stdio: 'inherit' });
      
      // Pull changes
      execSync('git pull origin main', { stdio: 'inherit' });
      
      console.log('✅ Pull completed successfully');
    } catch (error) {
      console.error('❌ Pull failed:', error.message);
      throw error;
    }
  }

  async checkForUpdates() {
    try {
      // Fetch latest changes without merging
      execSync('git fetch origin', { stdio: 'pipe' });
      
      // Check if there are new commits
      const localCommit = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
      const remoteCommit = execSync('git rev-parse origin/main', { encoding: 'utf8' }).trim();
      
      if (localCommit !== remoteCommit) {
        console.log('🔄 New changes detected, pulling...');
        await this.pullFromGitHub();
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('❌ Failed to check for updates:', error.message);
      return false;
    }
  }

  async startWatching() {
    console.log('👀 Starting file watcher...');
    
    // Watch for file changes
    let chokidar;
    try {
      const { default: chokidarModule } = await import('chokidar');
      chokidar = chokidarModule;
    } catch (error) {
      console.warn('⚠️ Chokidar not available, using fallback polling method');
      this.startPolling();
      return;
    }
    
    const watcher = chokidar.watch('src/**/*', {
      ignored: /(^|[\/\\])\../, // ignore dotfiles
      persistent: true,
      ignoreInitial: true,
    });

    let syncTimeout;
    
    watcher.on('change', (filePath) => {
      console.log(`📝 File changed: ${filePath}`);
      
      // Debounce sync to avoid multiple commits
      clearTimeout(syncTimeout);
      syncTimeout = setTimeout(() => {
        this.syncToGitHub().catch(console.error);
      }, 2000); // Wait 2 seconds before syncing
    });

    watcher.on('add', (filePath) => {
      console.log(`➕ File added: ${filePath}`);
      
      clearTimeout(syncTimeout);
      syncTimeout = setTimeout(() => {
        this.syncToGitHub().catch(console.error);
      }, 2000);
    });

    watcher.on('unlink', (filePath) => {
      console.log(`🗑️ File deleted: ${filePath}`);
      
      clearTimeout(syncTimeout);
      syncTimeout = setTimeout(() => {
        this.syncToGitHub().catch(console.error);
      }, 2000);
    });

    // Also check for updates periodically
    setInterval(async () => {
      await this.checkForUpdates();
    }, this.syncInterval);

    console.log('✅ File watcher started');
    
    // Keep the process running
    process.on('SIGINT', () => {
      console.log('\n🛑 Stopping file watcher...');
      watcher.close();
      process.exit(0);
    });
  }

  startPolling() {
    console.log('🔄 Starting polling method...');
    
    // Poll for changes every 5 seconds
    setInterval(async () => {
      await this.checkForUpdates();
    }, 5000);
    
    console.log('✅ Polling started');
  }

  async setupGitHooks() {
    try {
      console.log('🔧 Setting up Git hooks...');
      
      const hooksDir = path.join('.git', 'hooks');
      console.log('Hooks directory:', hooksDir);
      
      // Check if .git directory exists
      if (!fs.existsSync('.git')) {
        console.error('❌ .git directory not found. Make sure you are in a Git repository.');
        return;
      }
      
      if (!fs.existsSync(hooksDir)) {
        console.error('❌ .git/hooks directory not found.');
        return;
      }
      
      // Create pre-commit hook
      const preCommitHook = `#!/bin/sh
# Auto-sync pre-commit hook
echo "🔄 Pre-commit: Syncing changes..."
npm run git-sync:pre-commit
`;
      
      fs.writeFileSync(path.join(hooksDir, 'pre-commit'), preCommitHook);
      fs.chmodSync(path.join(hooksDir, 'pre-commit'), '755');
      
      // Create post-commit hook
      const postCommitHook = `#!/bin/sh
# Auto-sync post-commit hook
echo "🚀 Post-commit: Pushing changes..."
npm run git-sync:post-commit
`;
      
      fs.writeFileSync(path.join(hooksDir, 'post-commit'), postCommitHook);
      fs.chmodSync(path.join(hooksDir, 'post-commit'), '755');
      
      console.log('✅ Git hooks set up successfully');
    } catch (error) {
      console.error('❌ Failed to set up Git hooks:', error.message);
    }
  }
}

// CLI interface
async function main() {
  const script = new GitSyncScript();
  const command = process.argv[2];

  switch (command) {
    case 'sync':
      await script.syncToGitHub();
      break;
    case 'pull':
      await script.pullFromGitHub();
      break;
    case 'watch':
      await script.startWatching();
      break;
    case 'setup-hooks':
      await script.setupGitHooks();
      break;
    case 'check':
      await script.checkForUpdates();
      break;
    default:
      console.log(`
Git Sync Script

Usage:
  node scripts/git-sync.js <command>

Commands:
  sync        - Sync local changes to GitHub
  pull        - Pull changes from GitHub
  watch       - Start file watcher
  setup-hooks - Set up Git hooks
  check       - Check for updates

Examples:
  node scripts/git-sync.js sync
  node scripts/git-sync.js watch
      `);
  }
}

// Run if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export default GitSyncScript;
