import { emailService } from './email-service';

class EmailCronService {
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;

  // Start the cron service
  start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    console.log('Email cron service started');
    
    // Process scheduled campaigns every 5 minutes
    this.intervalId = setInterval(async () => {
      try {
        await this.processScheduledCampaigns();
      } catch (error) {
        console.error('Error processing scheduled campaigns:', error);
      }
    }, 5 * 60 * 1000); // 5 minutes

    // Also run immediately
    this.processScheduledCampaigns();
  }

  // Stop the cron service
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('Email cron service stopped');
  }

  // Process scheduled campaigns
  private async processScheduledCampaigns() {
    try {
      console.log('Processing scheduled email campaigns...');
      await emailService.processScheduledCampaigns();
      
      // Schedule new automated campaigns if needed
      await this.scheduleNewCampaigns();
      
      console.log('Scheduled campaigns processed successfully');
    } catch (error) {
      console.error('Failed to process scheduled campaigns:', error);
    }
  }

  // Schedule new automated campaigns based on frequency rules
  private async scheduleNewCampaigns() {
    try {
      // Check if we need to schedule new campaigns
      const shouldSchedule = await this.shouldScheduleNewCampaigns();
      
      if (shouldSchedule) {
        console.log('Scheduling new automated campaigns...');
        await emailService.scheduleAutomatedCampaigns();
      }
    } catch (error) {
      console.error('Failed to schedule new campaigns:', error);
    }
  }

  // Determine if we should schedule new campaigns
  private async shouldScheduleNewCampaigns(): Promise<boolean> {
    try {
      // This is a simple implementation - in production you'd want more sophisticated logic
      const now = new Date();
      const hour = now.getHours();
      
      // Only schedule during business hours (9 AM - 6 PM)
      if (hour < 9 || hour > 18) {
        return false;
      }

      // Schedule campaigns at different intervals
      const dayOfWeek = now.getDay();
      const dayOfMonth = now.getDate();
      
      // Different campaign types on different days
      const campaignSchedule = {
        1: ['subscription'], // Monday - Subscription reminder
        3: ['effectiveness'], // Wednesday - Effectiveness showcase
        5: ['testimonial'], // Friday - Testimonial focus
        15: ['sale'], // 15th of month - Sale announcement
        30: ['sale'] // 30th of month - Sale announcement
      };

      const scheduledTypes = campaignSchedule[dayOfMonth as keyof typeof campaignSchedule] || 
                           campaignSchedule[dayOfWeek as keyof typeof campaignSchedule] || [];

      return scheduledTypes.length > 0;
    } catch (error) {
      console.error('Error checking if should schedule campaigns:', error);
      return false;
    }
  }

  // Get cron service status
  getStatus() {
    return {
      isRunning: this.isRunning,
      intervalId: this.intervalId !== null
    };
  }
}

export const emailCronService = new EmailCronService();

// Auto-start the cron service when this module is imported
if (typeof window === 'undefined') {
  // Only start in server environment
  emailCronService.start();
}
