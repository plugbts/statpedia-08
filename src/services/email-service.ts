import { supabase } from '@/integrations/supabase/client';

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
  target_audience: 'non_subscribed' | 'free_trial' | 'all';
  is_active: boolean;
  scheduled_at: string | null;
  sent_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmailSend {
  id: string;
  campaign_id: string;
  user_id: string;
  email: string;
  sent_at: string;
  opened_at: string | null;
  clicked_at: string | null;
  unsubscribed_at: string | null;
  bounced_at: string | null;
  status: 'sent' | 'opened' | 'clicked' | 'unsubscribed' | 'bounced';
}

export interface UserEmailPreferences {
  id: string;
  user_id: string;
  email: string;
  is_subscribed: boolean;
  frequency: 'low' | 'normal' | 'high';
  last_email_sent: string | null;
  unsubscribe_token: string;
  created_at: string;
  updated_at: string;
}

export interface EmailAnalytics {
  id: string;
  campaign_id: string;
  date: string;
  emails_sent: number;
  emails_opened: number;
  emails_clicked: number;
  emails_unsubscribed: number;
  emails_bounced: number;
  created_at: string;
}

class EmailService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = import.meta.env.MODE === 'production' 
      ? 'https://statpedia.com' 
      : 'http://localhost:5173';
  }

  // Get all email templates
  async getEmailTemplates(): Promise<EmailTemplate[]> {
    const { data, error } = await supabase
      .from('email_templates')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  // Get template by type
  async getTemplateByType(templateType: string): Promise<EmailTemplate | null> {
    const { data, error } = await supabase
      .from('email_templates')
      .select('*')
      .eq('template_type', templateType)
      .eq('is_active', true)
      .single();

    if (error) return null;
    return data;
  }

  // Create email campaign
  async createCampaign(campaign: Omit<EmailCampaign, 'id' | 'created_at' | 'updated_at'>): Promise<EmailCampaign> {
    const { data, error } = await supabase
      .from('email_campaigns')
      .insert(campaign)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Get non-subscribed users for email campaigns
  async getNonSubscribedUsers(limit: number = 1000): Promise<Array<{
    user_id: string;
    email: string;
    display_name: string;
    last_email_sent: string | null;
  }>> {
    const { data, error } = await supabase
      .rpc('get_non_subscribed_users', {
        frequency_limit: '7 days',
        limit_count: limit
      });

    if (error) throw error;
    return data || [];
  }

  // Send email campaign
  async sendCampaign(campaignId: string, userIds: string[]): Promise<void> {
    const campaign = await this.getCampaign(campaignId);
    if (!campaign) throw new Error('Campaign not found');

    const users = await this.getNonSubscribedUsers(1000);
    const targetUsers = users.filter(user => userIds.includes(user.user_id));

    for (const user of targetUsers) {
      try {
        await this.sendEmailToUser(campaign, user);
      } catch (error) {
        console.error(`Failed to send email to ${user.email}:`, error);
      }
    }
  }

  // Send individual email
  private async sendEmailToUser(campaign: EmailCampaign, user: {
    user_id: string;
    email: string;
    display_name: string;
  }): Promise<void> {
    // Replace template variables
    const subject = this.replaceVariables(campaign.subject, {
      user_name: user.display_name,
      subscribe_url: `${this.baseUrl}/subscription?utm_source=email&utm_campaign=${campaign.id}`,
      plans_url: `${this.baseUrl}/subscription?utm_source=email&utm_campaign=${campaign.id}`,
      sale_url: `${this.baseUrl}/subscription?utm_source=email&utm_campaign=${campaign.id}&sale=true`,
      trial_url: `${this.baseUrl}/subscription?utm_source=email&utm_campaign=${campaign.id}&trial=true`,
      success_url: `${this.baseUrl}/?utm_source=email&utm_campaign=${campaign.id}#testimonials`,
      pro_url: `${this.baseUrl}/subscription?utm_source=email&utm_campaign=${campaign.id}&plan=pro`,
      testimonials_url: `${this.baseUrl}/?utm_source=email&utm_campaign=${campaign.id}#testimonials`
    });

    const content = this.replaceVariables(campaign.content, {
      user_name: user.display_name,
      subscribe_url: `${this.baseUrl}/subscription?utm_source=email&utm_campaign=${campaign.id}`,
      plans_url: `${this.baseUrl}/subscription?utm_source=email&utm_campaign=${campaign.id}`,
      sale_url: `${this.baseUrl}/subscription?utm_source=email&utm_campaign=${campaign.id}&sale=true`,
      trial_url: `${this.baseUrl}/subscription?utm_source=email&utm_campaign=${campaign.id}&trial=true`,
      success_url: `${this.baseUrl}/?utm_source=email&utm_campaign=${campaign.id}#testimonials`,
      pro_url: `${this.baseUrl}/subscription?utm_source=email&utm_campaign=${campaign.id}&plan=pro`,
      testimonials_url: `${this.baseUrl}/?utm_source=email&utm_campaign=${campaign.id}#testimonials`
    });

    const htmlContent = this.replaceVariables(campaign.html_content || '', {
      user_name: user.display_name,
      subscribe_url: `${this.baseUrl}/subscription?utm_source=email&utm_campaign=${campaign.id}`,
      plans_url: `${this.baseUrl}/subscription?utm_source=email&utm_campaign=${campaign.id}`,
      sale_url: `${this.baseUrl}/subscription?utm_source=email&utm_campaign=${campaign.id}&sale=true`,
      trial_url: `${this.baseUrl}/subscription?utm_source=email&utm_campaign=${campaign.id}&trial=true`,
      success_url: `${this.baseUrl}/?utm_source=email&utm_campaign=${campaign.id}#testimonials`,
      pro_url: `${this.baseUrl}/subscription?utm_source=email&utm_campaign=${campaign.id}&plan=pro`,
      testimonials_url: `${this.baseUrl}/?utm_source=email&utm_campaign=${campaign.id}#testimonials`
    });

    // In a real implementation, you would integrate with an email service like SendGrid, Mailgun, etc.
    // For now, we'll just log the email and store it in the database
    console.log(`Sending email to ${user.email}:`, {
      subject,
      content: content.substring(0, 100) + '...',
      campaign_id: campaign.id
    });

    // Record the email send
    const { error: sendError } = await supabase
      .from('email_sends')
      .insert({
        campaign_id: campaign.id,
        user_id: user.user_id,
        email: user.email,
        status: 'sent'
      });

    if (sendError) {
      console.error('Failed to record email send:', sendError);
    }

    // Update user's last email sent timestamp
    await this.updateUserEmailPreferences(user.user_id, {
      last_email_sent: new Date().toISOString()
    });
  }

  // Replace template variables
  private replaceVariables(template: string, variables: Record<string, string>): string {
    let result = template;
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(regex, value);
    }
    return result;
  }

  // Get campaign by ID
  async getCampaign(campaignId: string): Promise<EmailCampaign | null> {
    const { data, error } = await supabase
      .from('email_campaigns')
      .select('*')
      .eq('id', campaignId)
      .single();

    if (error) return null;
    return data;
  }

  // Get all campaigns
  async getCampaigns(): Promise<EmailCampaign[]> {
    const { data, error } = await supabase
      .from('email_campaigns')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  // Update user email preferences
  async updateUserEmailPreferences(userId: string, updates: Partial<UserEmailPreferences>): Promise<void> {
    const { error } = await supabase
      .from('user_email_preferences')
      .upsert({
        user_id: userId,
        ...updates,
        updated_at: new Date().toISOString()
      });

    if (error) throw error;
  }

  // Get email analytics for a campaign
  async getCampaignAnalytics(campaignId: string): Promise<EmailAnalytics[]> {
    const { data, error } = await supabase
      .from('email_analytics')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('date', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  // Get email send statistics
  async getEmailSendStats(campaignId: string): Promise<{
    total_sent: number;
    total_opened: number;
    total_clicked: number;
    total_unsubscribed: number;
    total_bounced: number;
    open_rate: number;
    click_rate: number;
  }> {
    const { data, error } = await supabase
      .from('email_sends')
      .select('status')
      .eq('campaign_id', campaignId);

    if (error) throw error;

    const stats = {
      total_sent: 0,
      total_opened: 0,
      total_clicked: 0,
      total_unsubscribed: 0,
      total_bounced: 0,
      open_rate: 0,
      click_rate: 0
    };

    data?.forEach(send => {
      stats.total_sent++;
      if (send.status === 'opened' || send.status === 'clicked') stats.total_opened++;
      if (send.status === 'clicked') stats.total_clicked++;
      if (send.status === 'unsubscribed') stats.total_unsubscribed++;
      if (send.status === 'bounced') stats.total_bounced++;
    });

    stats.open_rate = stats.total_sent > 0 ? (stats.total_opened / stats.total_sent) * 100 : 0;
    stats.click_rate = stats.total_sent > 0 ? (stats.total_clicked / stats.total_sent) * 100 : 0;

    return stats;
  }

  // Schedule automated email campaigns
  async scheduleAutomatedCampaigns(): Promise<void> {
    const templates = await this.getEmailTemplates();
    const nonSubscribedUsers = await this.getNonSubscribedUsers(1000);

    if (nonSubscribedUsers.length === 0) return;

    // Schedule different types of campaigns based on frequency
    const now = new Date();
    const campaigns = [];

    // Subscription reminder (every 7 days)
    const subscriptionTemplate = templates.find(t => t.template_type === 'subscription');
    if (subscriptionTemplate) {
      campaigns.push({
        name: `Subscription Reminder - ${now.toISOString().split('T')[0]}`,
        subject: subscriptionTemplate.subject_template,
        template_type: 'subscription',
        content: subscriptionTemplate.content_template,
        html_content: subscriptionTemplate.html_template,
        target_audience: 'non_subscribed',
        is_active: true,
        scheduled_at: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString() // Tomorrow
      });
    }

    // Sale announcement (every 14 days)
    const saleTemplate = templates.find(t => t.template_type === 'sale');
    if (saleTemplate && Math.random() < 0.3) { // 30% chance of sale
      campaigns.push({
        name: `Sale Announcement - ${now.toISOString().split('T')[0]}`,
        subject: saleTemplate.subject_template,
        template_type: 'sale',
        content: saleTemplate.content_template,
        html_content: saleTemplate.html_template,
        target_audience: 'non_subscribed',
        is_active: true,
        scheduled_at: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString() // Day after tomorrow
      });
    }

    // Effectiveness showcase (every 10 days)
    const effectivenessTemplate = templates.find(t => t.template_type === 'effectiveness');
    if (effectivenessTemplate) {
      campaigns.push({
        name: `Effectiveness Showcase - ${now.toISOString().split('T')[0]}`,
        subject: effectivenessTemplate.subject_template,
        template_type: 'effectiveness',
        content: effectivenessTemplate.content_template,
        html_content: effectivenessTemplate.html_template,
        target_audience: 'non_subscribed',
        is_active: true,
        scheduled_at: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString() // 3 days from now
      });
    }

    // Testimonial focus (every 12 days)
    const testimonialTemplate = templates.find(t => t.template_type === 'testimonial');
    if (testimonialTemplate) {
      campaigns.push({
        name: `Testimonial Focus - ${now.toISOString().split('T')[0]}`,
        subject: testimonialTemplate.subject_template,
        template_type: 'testimonial',
        content: testimonialTemplate.content_template,
        html_content: testimonialTemplate.html_template,
        target_audience: 'non_subscribed',
        is_active: true,
        scheduled_at: new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000).toISOString() // 4 days from now
      });
    }

    // Create campaigns
    for (const campaign of campaigns) {
      try {
        await this.createCampaign(campaign);
        console.log(`Created campaign: ${campaign.name}`);
      } catch (error) {
        console.error(`Failed to create campaign ${campaign.name}:`, error);
      }
    }
  }

  // Process scheduled campaigns
  async processScheduledCampaigns(): Promise<void> {
    const now = new Date();
    const { data: campaigns, error } = await supabase
      .from('email_campaigns')
      .select('*')
      .eq('is_active', true)
      .is('sent_at', null)
      .lte('scheduled_at', now.toISOString());

    if (error) {
      console.error('Failed to fetch scheduled campaigns:', error);
      return;
    }

    for (const campaign of campaigns || []) {
      try {
        const users = await this.getNonSubscribedUsers(1000);
        const userIds = users.map(u => u.user_id);
        
        await this.sendCampaign(campaign.id, userIds);
        
        // Mark campaign as sent
        await supabase
          .from('email_campaigns')
          .update({ sent_at: now.toISOString() })
          .eq('id', campaign.id);

        console.log(`Processed campaign: ${campaign.name}`);
      } catch (error) {
        console.error(`Failed to process campaign ${campaign.name}:`, error);
      }
    }
  }
}

export const emailService = new EmailService();
