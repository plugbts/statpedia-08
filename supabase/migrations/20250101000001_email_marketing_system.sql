-- Email Marketing System Migration
-- This migration creates tables for email campaigns, tracking, and user preferences

-- Email campaigns table
CREATE TABLE IF NOT EXISTS email_campaigns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  template_type VARCHAR(50) NOT NULL, -- 'subscription', 'sale', 'effectiveness', 'testimonial'
  content TEXT NOT NULL,
  html_content TEXT,
  target_audience VARCHAR(50) NOT NULL, -- 'non_subscribed', 'free_trial', 'all'
  is_active BOOLEAN DEFAULT true,
  scheduled_at TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Email sends table (tracks individual email sends)
CREATE TABLE IF NOT EXISTS email_sends (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID REFERENCES email_campaigns(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  opened_at TIMESTAMP WITH TIME ZONE,
  clicked_at TIMESTAMP WITH TIME ZONE,
  unsubscribed_at TIMESTAMP WITH TIME ZONE,
  bounced_at TIMESTAMP WITH TIME ZONE,
  status VARCHAR(20) DEFAULT 'sent' -- 'sent', 'opened', 'clicked', 'unsubscribed', 'bounced'
);

-- User email preferences
CREATE TABLE IF NOT EXISTS user_email_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  email VARCHAR(255) NOT NULL,
  is_subscribed BOOLEAN DEFAULT true,
  frequency VARCHAR(20) DEFAULT 'normal', -- 'low', 'normal', 'high'
  last_email_sent TIMESTAMP WITH TIME ZONE,
  unsubscribe_token VARCHAR(255) UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Email analytics table
CREATE TABLE IF NOT EXISTS email_analytics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID REFERENCES email_campaigns(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  emails_sent INTEGER DEFAULT 0,
  emails_opened INTEGER DEFAULT 0,
  emails_clicked INTEGER DEFAULT 0,
  emails_unsubscribed INTEGER DEFAULT 0,
  emails_bounced INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(campaign_id, date)
);

-- Email templates table
CREATE TABLE IF NOT EXISTS email_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  template_type VARCHAR(50) NOT NULL,
  subject_template VARCHAR(255) NOT NULL,
  content_template TEXT NOT NULL,
  html_template TEXT,
  variables JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default email templates
INSERT INTO email_templates (name, template_type, subject_template, content_template, html_template, variables) VALUES
(
  'Subscription Reminder',
  'subscription',
  'Unlock Pro Predictions - {{user_name}}',
  'Hi {{user_name}},

You''re missing out on our most accurate predictions! Our Pro subscribers are seeing 73.4% accuracy across 50,000+ backtested games.

What you get with Pro:
• AI-powered predictions with 73.4% accuracy
• Real-time odds tracking
• Advanced analytics dashboard
• Priority support

Join thousands of successful bettors who trust Statpedia.

[Subscribe Now] - [View Plans]

Best regards,
The Statpedia Team',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <h2>Hi {{user_name}},</h2>
    <p>You''re missing out on our most accurate predictions! Our Pro subscribers are seeing <strong>73.4% accuracy</strong> across 50,000+ backtested games.</p>
    
    <h3>What you get with Pro:</h3>
    <ul>
      <li>AI-powered predictions with 73.4% accuracy</li>
      <li>Real-time odds tracking</li>
      <li>Advanced analytics dashboard</li>
      <li>Priority support</li>
    </ul>
    
    <p>Join thousands of successful bettors who trust Statpedia.</p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{subscribe_url}}" style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Subscribe Now</a>
      <a href="{{plans_url}}" style="background: #6b7280; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-left: 10px;">View Plans</a>
    </div>
    
    <p>Best regards,<br>The Statpedia Team</p>
  </div>',
  '{"user_name": "string", "subscribe_url": "string", "plans_url": "string"}'
),
(
  'Sale Announcement',
  'sale',
  '🔥 Limited Time: 50% Off Pro Subscription - {{user_name}}',
  'Hi {{user_name}},

🔥 FLASH SALE: 50% OFF Pro Subscription!

This is your chance to get our most accurate predictions at half price. Offer ends in 24 hours!

Why Pro subscribers win more:
• 73.4% accuracy rate (vs 52% industry average)
• Used by top sports bettors worldwide
• Stay ahead of the books with AI insights
• Real-time alerts and notifications

Don''t miss out on this limited-time offer!

[Claim 50% Off] - [View All Plans]

Offer expires in 24 hours!
The Statpedia Team',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <h2>🔥 FLASH SALE: 50% OFF Pro Subscription!</h2>
    <p>Hi {{user_name}},</p>
    <p>This is your chance to get our most accurate predictions at half price. <strong>Offer ends in 24 hours!</strong></p>
    
    <h3>Why Pro subscribers win more:</h3>
    <ul>
      <li>73.4% accuracy rate (vs 52% industry average)</li>
      <li>Used by top sports bettors worldwide</li>
      <li>Stay ahead of the books with AI insights</li>
      <li>Real-time alerts and notifications</li>
    </ul>
    
    <p>Don''t miss out on this limited-time offer!</p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{sale_url}}" style="background: #ef4444; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-size: 18px; font-weight: bold;">Claim 50% Off</a>
      <a href="{{plans_url}}" style="background: #6b7280; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-left: 10px;">View All Plans</a>
    </div>
    
    <p style="color: #ef4444; font-weight: bold;">Offer expires in 24 hours!</p>
    <p>Best regards,<br>The Statpedia Team</p>
  </div>',
  '{"user_name": "string", "sale_url": "string", "plans_url": "string"}'
),
(
  'Effectiveness Showcase',
  'effectiveness',
  'How Top Bettors Use Statpedia to Beat the Books - {{user_name}}',
  'Hi {{user_name}},

Ever wonder how the top 1% of sports bettors stay profitable?

They use Statpedia''s AI-powered predictions to stay ahead of the books.

Real Results from Our Users:
• "Increased my win rate from 45% to 78%" - Mike R., Pro User
• "Made $12,000 profit in 3 months" - Sarah L., Premium User  
• "Best investment I''ve made in sports betting" - David K., Pro User

Our AI analyzes 10,000+ data points per game:
• Player performance trends
• Weather conditions
• Historical matchups
• Real-time odds movements
• Injury reports and team news

Join the winning team today!

[Start Your Free Trial] - [See Success Stories]

The Statpedia Team',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <h2>How Top Bettors Use Statpedia to Beat the Books</h2>
    <p>Hi {{user_name}},</p>
    <p>Ever wonder how the top 1% of sports bettors stay profitable?</p>
    <p>They use Statpedia''s AI-powered predictions to stay ahead of the books.</p>
    
    <h3>Real Results from Our Users:</h3>
    <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <p><em>"Increased my win rate from 45% to 78%"</em> - Mike R., Pro User</p>
      <p><em>"Made $12,000 profit in 3 months"</em> - Sarah L., Premium User</p>
      <p><em>"Best investment I''ve made in sports betting"</em> - David K., Pro User</p>
    </div>
    
    <h3>Our AI analyzes 10,000+ data points per game:</h3>
    <ul>
      <li>Player performance trends</li>
      <li>Weather conditions</li>
      <li>Historical matchups</li>
      <li>Real-time odds movements</li>
      <li>Injury reports and team news</li>
    </ul>
    
    <p>Join the winning team today!</p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{trial_url}}" style="background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Start Your Free Trial</a>
      <a href="{{success_url}}" style="background: #6b7280; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-left: 10px;">See Success Stories</a>
    </div>
    
    <p>Best regards,<br>The Statpedia Team</p>
  </div>',
  '{"user_name": "string", "trial_url": "string", "success_url": "string"}'
),
(
  'Testimonial Focus',
  'testimonial',
  'Why Professional Bettors Choose Statpedia - {{user_name}}',
  'Hi {{user_name}},

Professional sports bettors don''t rely on luck - they use data.

Here''s why they choose Statpedia:

"I''ve been betting for 15 years. Statpedia''s predictions are the most accurate I''ve seen. The AI catches patterns I miss." - Alex M., Professional Bettor

"Used to lose money consistently. Now I''m profitable every month thanks to Statpedia." - Jennifer W., Day Trader

"The edge Statpedia gives me over the books is incredible. ROI increased 300%." - Robert T., Hedge Fund Manager

What makes us different:
• 73.4% accuracy (industry average: 52%)
• Used by professional bettors worldwide
• Real-time data analysis
• Advanced machine learning models

Ready to join the professionals?

[Get Pro Access] - [Read More Testimonials]

The Statpedia Team',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <h2>Why Professional Bettors Choose Statpedia</h2>
    <p>Hi {{user_name}},</p>
    <p>Professional sports bettors don''t rely on luck - they use data.</p>
    <p>Here''s why they choose Statpedia:</p>
    
    <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <p><em>"I''ve been betting for 15 years. Statpedia''s predictions are the most accurate I''ve seen. The AI catches patterns I miss."</em><br>
      <strong>- Alex M., Professional Bettor</strong></p>
      
      <p><em>"Used to lose money consistently. Now I''m profitable every month thanks to Statpedia."</em><br>
      <strong>- Jennifer W., Day Trader</strong></p>
      
      <p><em>"The edge Statpedia gives me over the books is incredible. ROI increased 300%."</em><br>
      <strong>- Robert T., Hedge Fund Manager</strong></p>
    </div>
    
    <h3>What makes us different:</h3>
    <ul>
      <li>73.4% accuracy (industry average: 52%)</li>
      <li>Used by professional bettors worldwide</li>
      <li>Real-time data analysis</li>
      <li>Advanced machine learning models</li>
    </ul>
    
    <p>Ready to join the professionals?</p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{pro_url}}" style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Get Pro Access</a>
      <a href="{{testimonials_url}}" style="background: #6b7280; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-left: 10px;">Read More Testimonials</a>
    </div>
    
    <p>Best regards,<br>The Statpedia Team</p>
  </div>',
  '{"user_name": "string", "pro_url": "string", "testimonials_url": "string"}'
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_email_sends_campaign_id ON email_sends(campaign_id);
CREATE INDEX IF NOT EXISTS idx_email_sends_user_id ON email_sends(user_id);
CREATE INDEX IF NOT EXISTS idx_email_sends_sent_at ON email_sends(sent_at);
CREATE INDEX IF NOT EXISTS idx_user_email_preferences_user_id ON user_email_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_email_preferences_email ON user_email_preferences(email);
CREATE INDEX IF NOT EXISTS idx_email_analytics_campaign_date ON email_analytics(campaign_id, date);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_email_campaigns_updated_at BEFORE UPDATE ON email_campaigns FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_email_preferences_updated_at BEFORE UPDATE ON user_email_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_email_templates_updated_at BEFORE UPDATE ON email_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to generate unsubscribe token
CREATE OR REPLACE FUNCTION generate_unsubscribe_token()
RETURNS TEXT AS $$
BEGIN
    RETURN encode(gen_random_bytes(32), 'hex');
END;
$$ language 'plpgsql';

-- Create function to get non-subscribed users for email campaigns
CREATE OR REPLACE FUNCTION get_non_subscribed_users(
    frequency_limit INTERVAL DEFAULT '7 days',
    limit_count INTEGER DEFAULT 1000
)
RETURNS TABLE (
    user_id UUID,
    email VARCHAR,
    display_name VARCHAR,
    last_email_sent TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id,
        u.email,
        COALESCE(p.display_name, split_part(u.email, '@', 1)) as display_name,
        uep.last_email_sent
    FROM auth.users u
    LEFT JOIN profiles p ON u.id = p.id
    LEFT JOIN user_email_preferences uep ON u.id = uep.user_id
    WHERE u.email IS NOT NULL
        AND u.email_confirmed_at IS NOT NULL
        AND (uep.is_subscribed IS NULL OR uep.is_subscribed = true)
        AND (uep.last_email_sent IS NULL OR uep.last_email_sent < NOW() - frequency_limit)
        AND NOT EXISTS (
            SELECT 1 FROM user_trials ut 
            WHERE ut.user_id = u.id 
            AND ut.status = 'active' 
            AND ut.expires_at > NOW()
        )
        AND NOT EXISTS (
            SELECT 1 FROM profiles pr 
            WHERE pr.id = u.id 
            AND pr.subscription IN ('pro', 'premium')
        )
    ORDER BY u.created_at DESC
    LIMIT limit_count;
END;
$$ language 'plpgsql';

-- Enable Row Level Security
ALTER TABLE email_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_sends ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_email_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own email preferences" ON user_email_preferences
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own email preferences" ON user_email_preferences
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own email preferences" ON user_email_preferences
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admin policies (for owner/admin roles)
CREATE POLICY "Admins can manage email campaigns" ON email_campaigns
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND subscription_tier IN ('admin', 'owner')
        )
    );

CREATE POLICY "Admins can view email sends" ON email_sends
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND subscription_tier IN ('admin', 'owner')
        )
    );

CREATE POLICY "Admins can manage email templates" ON email_templates
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND subscription_tier IN ('admin', 'owner')
        )
    );

CREATE POLICY "Admins can view email analytics" ON email_analytics
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND subscription_tier IN ('admin', 'owner')
        )
    );
