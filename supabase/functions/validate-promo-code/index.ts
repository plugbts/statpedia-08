import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PromoCodeRequest {
  code: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get user from authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { code }: PromoCodeRequest = await req.json();

    if (!code) {
      return new Response(
        JSON.stringify({ error: 'Promo code is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Validating promo code: ${code} for user: ${user.id}`);

    // Check if promo code exists and is active
    const { data: promoCode, error: promoError } = await supabase
      .from('promo_codes')
      .select('*')
      .eq('code', code.toUpperCase())
      .eq('is_active', true)
      .single();

    if (promoError || !promoCode) {
      console.log('Promo code not found or inactive');
      return new Response(
        JSON.stringify({ valid: false, error: 'Invalid or expired promo code' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if expired
    if (promoCode.expires_at && new Date(promoCode.expires_at) < new Date()) {
      console.log('Promo code expired');
      return new Response(
        JSON.stringify({ valid: false, error: 'Promo code has expired' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check usage limit
    if (promoCode.usage_limit && promoCode.used_count >= promoCode.usage_limit) {
      console.log('Promo code usage limit reached');
      return new Response(
        JSON.stringify({ valid: false, error: 'Promo code usage limit reached' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user has already used this promo code
    const { data: existingUsage } = await supabase
      .from('promo_code_usage')
      .select('id')
      .eq('promo_code_id', promoCode.id)
      .eq('user_id', user.id)
      .single();

    if (existingUsage) {
      console.log('User has already used this promo code');
      return new Response(
        JSON.stringify({ valid: false, error: 'You have already used this promo code' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Promo code is valid');

    // Return validation result with only necessary info
    return new Response(
      JSON.stringify({
        valid: true,
        discountType: promoCode.discount_type,
        discountValue: promoCode.discount_value,
        trialDays: promoCode.trial_days,
        description: promoCode.description,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error validating promo code:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});