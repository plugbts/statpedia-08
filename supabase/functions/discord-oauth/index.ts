import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DISCORD_CLIENT_ID = '1422412327155794076';
const DISCORD_SERVER_ID = '760929736137506857';
const DISCORD_REDIRECT_URI = 'https://rfdrifnsfobqlzorcesn.supabase.co/functions/v1/discord-oauth';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state'); // user_id passed as state
    
    console.log('Discord OAuth callback received', { code: !!code, state });

    if (!code || !state) {
      throw new Error('Missing code or state parameter');
    }

    // Exchange code for access token
    const clientSecret = Deno.env.get('DISCORD_CLIENT_SECRET');
    if (!clientSecret) {
      throw new Error('Discord client secret not configured');
    }

    const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: DISCORD_CLIENT_ID,
        client_secret: clientSecret,
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: DISCORD_REDIRECT_URI,
      }),
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      console.error('Token exchange failed:', error);
      throw new Error('Failed to exchange Discord code for token');
    }

    const tokenData = await tokenResponse.json();
    console.log('Token obtained successfully');

    // Get user info from Discord
    const userResponse = await fetch('https://discord.com/api/users/@me', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
      },
    });

    if (!userResponse.ok) {
      throw new Error('Failed to fetch Discord user info');
    }

    const discordUser = await userResponse.json();
    console.log('Discord user info obtained:', discordUser.username);

    // Check if user is in the server
    const guildResponse = await fetch(`https://discord.com/api/users/@me/guilds/${DISCORD_SERVER_ID}/member`, {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
      },
    });

    const serverJoined = guildResponse.ok;
    console.log('Server membership check:', serverJoined);

    // Save to Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: existingLink } = await supabase
      .from('discord_links')
      .select('*')
      .eq('user_id', state)
      .single();

    if (existingLink) {
      return new Response(
        JSON.stringify({ error: 'Discord account already linked' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const { error: insertError } = await supabase
      .from('discord_links')
      .insert({
        user_id: state,
        discord_id: discordUser.id,
        discord_username: discordUser.username,
        server_joined: serverJoined,
        subscription_extended: false,
      });

    if (insertError) {
      console.error('Database insert error:', insertError);
      throw new Error('Failed to save Discord link');
    }

    console.log('Discord link saved successfully');

    // Redirect back to app with success
    return Response.redirect(`https://rfdrifnsfobqlzorcesn.lovable.app/?discord=success`, 302);

  } catch (error) {
    console.error('Discord OAuth error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
