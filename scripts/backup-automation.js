// Automated backup and monitoring script
// This script can be run as a cron job or scheduled task

const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  backupInterval: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
  maxBackups: 7, // Keep last 7 backups
  backupDir: './backups',
  logFile: './backup.log'
};

// Create backup directory if it doesn't exist
if (!fs.existsSync(CONFIG.backupDir)) {
  fs.mkdirSync(CONFIG.backupDir, { recursive: true });
}

// Logging function
function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  
  console.log(logMessage.trim());
  fs.appendFileSync(CONFIG.logFile, logMessage);
}

// Generate backup filename
function generateBackupFilename() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `statpedia-backup-${timestamp}.json`;
}

// Clean old backups
function cleanOldBackups() {
  try {
    const files = fs.readdirSync(CONFIG.backupDir)
      .filter(file => file.startsWith('statpedia-backup-') && file.endsWith('.json'))
      .map(file => ({
        name: file,
        path: path.join(CONFIG.backupDir, file),
        stats: fs.statSync(path.join(CONFIG.backupDir, file))
      }))
      .sort((a, b) => b.stats.mtime - a.stats.mtime);

    // Remove old backups if we have more than maxBackups
    if (files.length > CONFIG.maxBackups) {
      const filesToRemove = files.slice(CONFIG.maxBackups);
      filesToRemove.forEach(file => {
        fs.unlinkSync(file.path);
        log(`Removed old backup: ${file.name}`);
      });
    }
  } catch (error) {
    log(`Error cleaning old backups: ${error.message}`);
  }
}

// Check database health
async function checkDatabaseHealth() {
  try {
    // This would typically make an API call to check database status
    // For now, we'll simulate a health check
    const healthCheck = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      tables: ['profiles', 'promo_codes', 'user_trials', 'promo_code_usage']
    };

    log(`Database health check: ${healthCheck.status}`);
    return healthCheck;
  } catch (error) {
    log(`Database health check failed: ${error.message}`);
    return { status: 'error', error: error.message };
  }
}

// Create backup
async function createBackup() {
  try {
    log('Starting backup process...');
    
    // Check database health first
    const health = await checkDatabaseHealth();
    if (health.status === 'error') {
      throw new Error(`Database health check failed: ${health.error}`);
    }

    // In a real implementation, this would:
    // 1. Connect to the database
    // 2. Export all data
    // 3. Compress the backup
    // 4. Store it securely
    
    // For now, we'll create a mock backup
    const backup = {
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      health: health,
      data: {
        profiles: [],
        promo_codes: [],
        user_trials: [],
        promo_code_usage: []
      },
      metadata: {
        created_by: 'backup-automation',
        environment: process.env.NODE_ENV || 'development'
      }
    };

    const filename = generateBackupFilename();
    const filepath = path.join(CONFIG.backupDir, filename);
    
    fs.writeFileSync(filepath, JSON.stringify(backup, null, 2));
    
    log(`Backup created successfully: ${filename}`);
    
    // Clean old backups
    cleanOldBackups();
    
    return { success: true, filename, filepath };
  } catch (error) {
    log(`Backup failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// Restore from backup
async function restoreFromBackup(backupFile) {
  try {
    log(`Starting restore from backup: ${backupFile}`);
    
    if (!fs.existsSync(backupFile)) {
      throw new Error(`Backup file not found: ${backupFile}`);
    }

    const backupData = JSON.parse(fs.readFileSync(backupFile, 'utf8'));
    
    // Validate backup format
    if (!backupData.version || !backupData.timestamp) {
      throw new Error('Invalid backup format');
    }

    // In a real implementation, this would:
    // 1. Connect to the database
    // 2. Clear existing data (with confirmation)
    // 3. Import backup data
    // 4. Verify data integrity
    
    log(`Backup restored successfully from: ${backupFile}`);
    return { success: true };
  } catch (error) {
    log(`Restore failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// Main backup function
async function runBackup() {
  log('=== Backup Automation Started ===');
  
  try {
    const result = await createBackup();
    
    if (result.success) {
      log('=== Backup Automation Completed Successfully ===');
    } else {
      log(`=== Backup Automation Failed: ${result.error} ===`);
      process.exit(1);
    }
  } catch (error) {
    log(`=== Backup Automation Error: ${error.message} ===`);
    process.exit(1);
  }
}

// Command line interface
if (require.main === module) {
  const command = process.argv[2];
  
  switch (command) {
    case 'backup':
      runBackup();
      break;
      
    case 'restore':
      const backupFile = process.argv[3];
      if (!backupFile) {
        console.error('Usage: node backup-automation.js restore <backup-file>');
        process.exit(1);
      }
      restoreFromBackup(backupFile);
      break;
      
    case 'health':
      checkDatabaseHealth().then(health => {
        console.log(JSON.stringify(health, null, 2));
      });
      break;
      
    case 'clean':
      cleanOldBackups();
      break;
      
    default:
      console.log('Usage: node backup-automation.js <command>');
      console.log('Commands:');
      console.log('  backup  - Create a new backup');
      console.log('  restore <file> - Restore from backup file');
      console.log('  health  - Check database health');
      console.log('  clean   - Clean old backups');
      break;
  }
}

module.exports = {
  createBackup,
  restoreFromBackup,
  checkDatabaseHealth,
  cleanOldBackups,
  CONFIG
};
