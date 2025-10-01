import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    const { campaignId, userIds } = await req.json()

    if (!campaignId || !userIds || !Array.isArray(userIds)) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get campaign details
    const { data: campaign, error: campaignError } = await supabaseClient
      .from('email_campaigns')
      .select('*')
      .eq('id', campaignId)
      .single()

    if (campaignError || !campaign) {
      return new Response(
        JSON.stringify({ error: 'Campaign not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get user details
    const { data: users, error: usersError } = await supabaseClient
      .from('user_email_preferences')
      .select(`
        user_id,
        email,
        is_subscribed,
        last_email_sent
      `)
      .in('user_id', userIds)
      .eq('is_subscribed', true)

    if (usersError) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch users' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const baseUrl = Deno.env.get('SITE_URL') || 'https://statpedia.com'
    const sentEmails = []

    // Process each user
    for (const user of users || []) {
      try {
        // Replace template variables
        const subject = replaceVariables(campaign.subject, {
          user_name: user.email.split('@')[0],
          subscribe_url: `${baseUrl}/subscription?utm_source=email&utm_campaign=${campaign.id}`,
          plans_url: `${baseUrl}/subscription?utm_source=email&utm_campaign=${campaign.id}`,
          sale_url: `${baseUrl}/subscription?utm_source=email&utm_campaign=${campaign.id}&sale=true`,
          trial_url: `${baseUrl}/subscription?utm_source=email&utm_campaign=${campaign.id}&trial=true`,
          success_url: `${baseUrl}/?utm_source=email&utm_campaign=${campaign.id}#testimonials`,
          pro_url: `${baseUrl}/subscription?utm_source=email&utm_campaign=${campaign.id}&plan=pro`,
          testimonials_url: `${baseUrl}/?utm_source=email&utm_campaign=${campaign.id}#testimonials`
        })

        const content = replaceVariables(campaign.content, {
          user_name: user.email.split('@')[0],
          subscribe_url: `${baseUrl}/subscription?utm_source=email&utm_campaign=${campaign.id}`,
          plans_url: `${baseUrl}/subscription?utm_source=email&utm_campaign=${campaign.id}`,
          sale_url: `${baseUrl}/subscription?utm_source=email&utm_campaign=${campaign.id}&sale=true`,
          trial_url: `${baseUrl}/subscription?utm_source=email&utm_campaign=${campaign.id}&trial=true`,
          success_url: `${baseUrl}/?utm_source=email&utm_campaign=${campaign.id}#testimonials`,
          pro_url: `${baseUrl}/subscription?utm_source=email&utm_campaign=${campaign.id}&plan=pro`,
          testimonials_url: `${baseUrl}/?utm_source=email&utm_campaign=${campaign.id}#testimonials`
        })

        const htmlContent = replaceVariables(campaign.html_content || '', {
          user_name: user.email.split('@')[0],
          subscribe_url: `${baseUrl}/subscription?utm_source=email&utm_campaign=${campaign.id}`,
          plans_url: `${baseUrl}/subscription?utm_source=email&utm_campaign=${campaign.id}`,
          sale_url: `${baseUrl}/subscription?utm_source=email&utm_campaign=${campaign.id}&sale=true`,
          trial_url: `${baseUrl}/subscription?utm_source=email&utm_campaign=${campaign.id}&trial=true`,
          success_url: `${baseUrl}/?utm_source=email&utm_campaign=${campaign.id}#testimonials`,
          pro_url: `${baseUrl}/subscription?utm_source=email&utm_campaign=${campaign.id}&plan=pro`,
          testimonials_url: `${baseUrl}/?utm_source=email&utm_campaign=${campaign.id}#testimonials`
        })

        // In a real implementation, you would send the email using a service like SendGrid, Mailgun, etc.
        // For now, we'll just log it and store it in the database
        console.log(`Sending email to ${user.email}:`, {
          subject,
          campaign_id: campaign.id
        })

        // Record the email send
        const { error: sendError } = await supabaseClient
          .from('email_sends')
          .insert({
            campaign_id: campaign.id,
            user_id: user.user_id,
            email: user.email,
            status: 'sent'
          })

        if (sendError) {
          console.error(`Failed to record email send for ${user.email}:`, sendError)
          continue
        }

        // Update user's last email sent timestamp
        await supabaseClient
          .from('user_email_preferences')
          .upsert({
            user_id: user.user_id,
            email: user.email,
            last_email_sent: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })

        sentEmails.push({
          user_id: user.user_id,
          email: user.email,
          status: 'sent'
        })

      } catch (error) {
        console.error(`Failed to send email to ${user.email}:`, error)
        sentEmails.push({
          user_id: user.user_id,
          email: user.email,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    // Update campaign as sent
    await supabaseClient
      .from('email_campaigns')
      .update({ sent_at: new Date().toISOString() })
      .eq('id', campaignId)

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent_count: sentEmails.filter(e => e.status === 'sent').length,
        failed_count: sentEmails.filter(e => e.status === 'failed').length,
        emails: sentEmails
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in send-email-campaign function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

// Helper function to replace template variables
function replaceVariables(template: string, variables: Record<string, string>): string {
  let result = template
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{${key}}}`, 'g')
    result = result.replace(regex, value)
  }
  return result
}
