// Supabase removed - using Hasura + Neon only

export interface EmailTemplate {
  id: string;
  name: string;
  template_type: 'subscription' | 'sale' | 'effectiveness' | 'testimonial';
  subject_template: string;
  content_template: string;
  html_template: string;
  variables: Record<string, string>;
  is_active: boolean;
}

export interface EmailCampaign {
  id: string;
  name: string;
  subject: string;
  template_type: string;
  content: string;
  html_content: string;
  recipient_count: number;
  sent_count: number;
  scheduled_at: string;
  sent_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface EmailUser {
  user_id: string;
  email: string;
  name: string;
  subscription_status: string;
  created_at: string;
}

export interface EmailAnalytics {
  campaign_id: string;
  opens: number;
  clicks: number;
  unsubscribes: number;
  bounces: number;
  created_at: string;
  updated_at: string;
}

class EmailService {
  // Stub methods - Supabase removed, using Hasura + Neon only
  
  async getTemplates(): Promise<EmailTemplate[]> {
    console.log('📧 Email templates: Supabase removed, using Hasura + Neon only');
    return [];
  }

  async createTemplate(template: Omit<EmailTemplate, 'id'>): Promise<EmailTemplate | null> {
    console.log('📧 Create template: Supabase removed, using Hasura + Neon only');
    return null;
  }

  async updateTemplate(id: string, updates: Partial<EmailTemplate>): Promise<boolean> {
    console.log('📧 Update template: Supabase removed, using Hasura + Neon only');
    return false;
  }

  async deleteTemplate(id: string): Promise<boolean> {
    console.log('📧 Delete template: Supabase removed, using Hasura + Neon only');
    return false;
  }

  async getCampaigns(): Promise<EmailCampaign[]> {
    console.log('📧 Email campaigns: Supabase removed, using Hasura + Neon only');
    return [];
  }

  async createCampaign(campaign: Omit<EmailCampaign, 'id' | 'sent_count' | 'created_at' | 'updated_at'>): Promise<EmailCampaign | null> {
    console.log('📧 Create campaign: Supabase removed, using Hasura + Neon only');
    return null;
  }

  async updateCampaign(id: string, updates: Partial<EmailCampaign>): Promise<boolean> {
    console.log('📧 Update campaign: Supabase removed, using Hasura + Neon only');
    return false;
  }

  async deleteCampaign(id: string): Promise<boolean> {
    console.log('📧 Delete campaign: Supabase removed, using Hasura + Neon only');
    return false;
  }

  async sendEmail(to: string, subject: string, content: string, htmlContent?: string): Promise<boolean> {
    console.log('📧 Send email: Supabase removed, using Hasura + Neon only');
    console.log(`📧 Would send to: ${to}, subject: ${subject}`);
    return false;
  }

  async sendCampaign(campaignId: string, userIds: string[]): Promise<boolean> {
    console.log('📧 Send campaign: Supabase removed, using Hasura + Neon only');
    console.log(`📧 Would send campaign ${campaignId} to ${userIds.length} users`);
    return false;
  }

  async getUsers(limit: number = 100, offset: number = 0): Promise<EmailUser[]> {
    console.log('📧 Get users: Supabase removed, using Hasura + Neon only');
    return [];
  }

  async getNonSubscribedUsers(limit: number = 100): Promise<EmailUser[]> {
    console.log('📧 Get non-subscribed users: Supabase removed, using Hasura + Neon only');
    return [];
  }

  async createCampaignFromTemplate(templateId: string, campaignData: any): Promise<EmailCampaign | null> {
    console.log('📧 Create campaign from template: Supabase removed, using Hasura + Neon only');
    return null;
  }

  async getAnalytics(campaignId: string): Promise<EmailAnalytics | null> {
    console.log('📧 Get analytics: Supabase removed, using Hasura + Neon only');
    return null;
  }

  async updateAnalytics(campaignId: string, analytics: Partial<EmailAnalytics>): Promise<boolean> {
    console.log('📧 Update analytics: Supabase removed, using Hasura + Neon only');
    return false;
  }

  // Process scheduled campaigns
  async processScheduledCampaigns(): Promise<void> {
    console.log('📧 Email campaigns: Supabase removed, using Hasura + Neon only');
    console.log('📧 No scheduled campaigns to process - email service disabled');
    return;
  }
}

export const emailService = new EmailService();