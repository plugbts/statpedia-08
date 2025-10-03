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

    // Get current user
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if user is admin
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('subscription_tier')
      .eq('user_id', user.id)
      .single()

    if (profileError || !profile || (profile.subscription_tier !== 'admin' && profile.subscription_tier !== 'owner')) {
      return new Response(
        JSON.stringify({ error: 'Forbidden - Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get current month start and end
    const now = new Date()
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
    
    // Get previous month start and end
    const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)

    // Call the database function to get R2 usage stats
    const { data: currentMonthData, error: currentError } = await supabaseClient
      .rpc('get_r2_usage_stats', {
        bucket_name: 'statpedia-assets',
        start_date: currentMonthStart.toISOString(),
        end_date: currentMonthEnd.toISOString()
      })

    const { data: previousMonthData, error: previousError } = await supabaseClient
      .rpc('get_r2_usage_stats', {
        bucket_name: 'statpedia-assets',
        start_date: previousMonthStart.toISOString(),
        end_date: previousMonthEnd.toISOString()
      })

    if (currentError || previousError) {
      console.error('Error fetching R2 usage stats:', currentError || previousError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch R2 usage statistics' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Calculate daily average and projections
    const daysInCurrentMonth = Math.ceil((currentMonthEnd.getTime() - currentMonthStart.getTime()) / (1000 * 60 * 60 * 24))
    const daysPassed = Math.ceil((now.getTime() - currentMonthStart.getTime()) / (1000 * 60 * 60 * 24))
    
    const currentMonth = currentMonthData || {
      storage_gb: 0,
      operations_count: 0,
      bandwidth_gb: 0,
      cost_usd: 0,
      last_updated: now.toISOString()
    }

    const previousMonth = previousMonthData || {
      storage_gb: 0,
      operations_count: 0,
      bandwidth_gb: 0,
      cost_usd: 0,
      last_updated: previousMonthEnd.toISOString()
    }

    const dailyAverage = {
      storage_gb: currentMonth.storage_gb,
      operations_count: Math.round(currentMonth.operations_count / daysPassed),
      bandwidth_gb: Number((currentMonth.bandwidth_gb / daysPassed).toFixed(3)),
      cost_usd: Number((currentMonth.cost_usd / daysPassed).toFixed(4)),
      last_updated: now.toISOString()
    }

    const projectedMonthly = {
      storage_gb: currentMonth.storage_gb,
      operations_count: Math.round((currentMonth.operations_count / daysPassed) * daysInCurrentMonth),
      bandwidth_gb: Number(((currentMonth.bandwidth_gb / daysPassed) * daysInCurrentMonth).toFixed(2)),
      cost_usd: Number(((currentMonth.cost_usd / daysPassed) * daysInCurrentMonth).toFixed(2)),
      last_updated: now.toISOString()
    }

    const result = {
      current_month: currentMonth,
      previous_month: previousMonth,
      daily_average: dailyAverage,
      projected_monthly: projectedMonthly
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in get-r2-usage-stats function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
