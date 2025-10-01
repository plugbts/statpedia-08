#!/usr/bin/env node

/**
 * Loveable Sync Script
 * Synchronizes local changes with Loveable dev project
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class LoveableSyncScript {
  constructor() {
    this.projectId = process.env.VITE_LOVEABLE_PROJECT_ID || 'statpedia-08';
    this.apiUrl = process.env.VITE_LOVEABLE_API_URL || 'https://api.loveable.dev';
    this.apiKey = process.env.VITE_LOVEABLE_API_KEY;
    this.syncInterval = 30000; // 30 seconds
    this.isRunning = false;
  }

  async syncToLoveable() {
    try {
      if (!this.apiKey) {
        console.log('⚠️ No Loveable API key found. Set VITE_LOVEABLE_API_KEY environment variable.');
        return;
      }

      console.log('🔄 Syncing changes to Loveable...');
      
      // Check if there are changes
      const status = execSync('git status --porcelain', { encoding: 'utf8' });
      
      if (!status.trim()) {
        console.log('✅ No changes to sync');
        return;
      }

      // Add all changes
      execSync('git add .', { stdio: 'inherit' });
      console.log('📁 Added all changes to staging');

      // Commit changes
      const commitMessage = `Loveable sync: ${new Date().toISOString()}`;
      execSync(`git commit -m "${commitMessage}"`, { stdio: 'inherit' });
      console.log('💾 Committed changes');

      // Push changes to GitHub (Loveable will sync from there)
      execSync('git push origin main', { stdio: 'inherit' });
      console.log('🚀 Pushed changes to GitHub (Loveable will sync automatically)');

      console.log('✅ Loveable sync completed');
      
    } catch (error) {
      console.error('❌ Loveable sync failed:', error.message);
    }
  }

  async startWatching() {
    if (this.isRunning) {
      console.log('⚠️ Loveable sync is already running');
      return;
    }

    console.log('👀 Starting Loveable sync watcher...');
    this.isRunning = true;

    // Initial sync
    await this.syncToLoveable();

    // Watch for changes
    setInterval(async () => {
      await this.syncToLoveable();
    }, this.syncInterval);
  }

  async checkConnection() {
    try {
      console.log('🔍 Checking Loveable connection...');
      
      if (!this.apiKey) {
        console.log('❌ No Loveable API key configured');
        return false;
      }

      // Check if we can reach the API
      const response = await fetch(`${this.apiUrl}/projects/${this.projectId}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        console.log('✅ Loveable connection successful');
        return true;
      } else {
        console.log(`❌ Loveable connection failed: ${response.status}`);
        return false;
      }
    } catch (error) {
      console.log(`❌ Loveable connection error: ${error.message}`);
      return false;
    }
  }
}

// CLI handling
const command = process.argv[2];
const syncScript = new LoveableSyncScript();

switch (command) {
  case 'sync':
    syncScript.syncToLoveable();
    break;
  case 'watch':
    syncScript.startWatching();
    break;
  case 'check':
    syncScript.checkConnection();
    break;
  default:
    console.log('Usage: node loveable-sync.js [sync|watch|check]');
    console.log('  sync  - Sync changes once');
    console.log('  watch - Start watching for changes');
    console.log('  check - Check connection status');
}
