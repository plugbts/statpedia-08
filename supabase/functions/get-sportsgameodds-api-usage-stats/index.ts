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

    // Call the database function to get API usage stats
    const { data: currentMonthData, error: currentError } = await supabaseClient
      .rpc('get_sportsgameodds_api_usage_stats', {
        user_id: user.id,
        start_date: currentMonthStart.toISOString(),
        end_date: currentMonthEnd.toISOString()
      })

    const { data: previousMonthData, error: previousError } = await supabaseClient
      .rpc('get_sportsgameodds_api_usage_stats', {
        user_id: user.id,
        start_date: previousMonthStart.toISOString(),
        end_date: previousMonthEnd.toISOString()
      })

    if (currentError || previousError) {
      console.error('Error fetching API usage stats:', currentError || previousError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch API usage statistics' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Calculate daily average and projections
    const daysInCurrentMonth = Math.ceil((currentMonthEnd.getTime() - currentMonthStart.getTime()) / (1000 * 60 * 60 * 24))
    const daysPassed = Math.ceil((now.getTime() - currentMonthStart.getTime()) / (1000 * 60 * 60 * 24))
    
    const currentMonth = currentMonthData || {
      total_requests: 0,
      total_response_time_ms: 0,
      cache_hits: 0,
      cache_misses: 0,
      requests_by_endpoint: {},
      requests_by_sport: {},
      estimated_cost_usd: 0,
      last_updated: now.toISOString()
    }

    const previousMonth = previousMonthData || {
      total_requests: 0,
      total_response_time_ms: 0,
      cache_hits: 0,
      cache_misses: 0,
      requests_by_endpoint: {},
      requests_by_sport: {},
      estimated_cost_usd: 0,
      last_updated: previousMonthEnd.toISOString()
    }

    const dailyAverage = {
      total_requests: Math.round(currentMonth.total_requests / daysPassed),
      total_response_time_ms: Math.round(currentMonth.total_response_time_ms / daysPassed),
      cache_hits: Math.round(currentMonth.cache_hits / daysPassed),
      cache_misses: Math.round(currentMonth.cache_misses / daysPassed),
      requests_by_endpoint: Object.fromEntries(
        Object.entries(currentMonth.requests_by_endpoint || {}).map(([key, value]) => [
          key, Math.round((value as number) / daysPassed)
        ])
      ),
      requests_by_sport: Object.fromEntries(
        Object.entries(currentMonth.requests_by_sport || {}).map(([key, value]) => [
          key, Math.round((value as number) / daysPassed)
        ])
      ),
      estimated_cost_usd: Number((currentMonth.estimated_cost_usd / daysPassed).toFixed(4)),
      last_updated: now.toISOString()
    }

    const projectedMonthly = {
      total_requests: Math.round((currentMonth.total_requests / daysPassed) * daysInCurrentMonth),
      total_response_time_ms: Math.round((currentMonth.total_response_time_ms / daysPassed) * daysInCurrentMonth),
      cache_hits: Math.round((currentMonth.cache_hits / daysPassed) * daysInCurrentMonth),
      cache_misses: Math.round((currentMonth.cache_misses / daysPassed) * daysInCurrentMonth),
      requests_by_endpoint: Object.fromEntries(
        Object.entries(currentMonth.requests_by_endpoint || {}).map(([key, value]) => [
          key, Math.round(((value as number) / daysPassed) * daysInCurrentMonth)
        ])
      ),
      requests_by_sport: Object.fromEntries(
        Object.entries(currentMonth.requests_by_sport || {}).map(([key, value]) => [
          key, Math.round(((value as number) / daysPassed) * daysInCurrentMonth)
        ])
      ),
      estimated_cost_usd: Number(((currentMonth.estimated_cost_usd / daysPassed) * daysInCurrentMonth).toFixed(2)),
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
    console.error('Error in get-sportsgameodds-api-usage-stats function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
