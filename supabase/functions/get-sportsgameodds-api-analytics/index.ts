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

    // Get top endpoints
    const { data: topEndpoints, error: endpointsError } = await supabaseClient
      .from('api_usage_logs')
      .select('endpoint, response_time_ms')
      .gte('created_at', currentMonthStart.toISOString())
      .lte('created_at', currentMonthEnd.toISOString())

    // Get top sports
    const { data: topSports, error: sportsError } = await supabaseClient
      .from('api_usage_logs')
      .select('sport')
      .gte('created_at', currentMonthStart.toISOString())
      .lte('created_at', currentMonthEnd.toISOString())

    // Get top users
    const { data: topUsers, error: usersError } = await supabaseClient
      .from('api_usage_logs')
      .select('user_id')
      .gte('created_at', currentMonthStart.toISOString())
      .lte('created_at', currentMonthEnd.toISOString())

    if (endpointsError || sportsError || usersError) {
      console.error('Error fetching analytics data:', endpointsError || sportsError || usersError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch analytics data' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Process top endpoints
    const endpointStats = new Map<string, { requests: number; totalResponseTime: number }>()
    topEndpoints?.forEach(log => {
      const existing = endpointStats.get(log.endpoint) || { requests: 0, totalResponseTime: 0 }
      endpointStats.set(log.endpoint, {
        requests: existing.requests + 1,
        totalResponseTime: existing.totalResponseTime + (log.response_time_ms || 0)
      })
    })

    const topEndpointsResult = Array.from(endpointStats.entries())
      .map(([endpoint, stats]) => ({
        endpoint,
        requests: stats.requests,
        avg_response_time: Math.round(stats.totalResponseTime / stats.requests)
      }))
      .sort((a, b) => b.requests - a.requests)
      .slice(0, 5)

    // Process top sports
    const sportStats = new Map<string, number>()
    topSports?.forEach(log => {
      if (log.sport) {
        sportStats.set(log.sport, (sportStats.get(log.sport) || 0) + 1)
      }
    })

    const totalSportRequests = Array.from(sportStats.values()).reduce((sum, count) => sum + count, 0)
    const topSportsResult = Array.from(sportStats.entries())
      .map(([sport, requests]) => ({
        sport: sport.toUpperCase(),
        requests,
        percentage: Number(((requests / totalSportRequests) * 100).toFixed(1))
      }))
      .sort((a, b) => b.requests - a.requests)
      .slice(0, 5)

    // Process top users
    const userStats = new Map<string, number>()
    topUsers?.forEach(log => {
      if (log.user_id) {
        userStats.set(log.user_id, (userStats.get(log.user_id) || 0) + 1)
      }
    })

    // Get user emails for top users
    const topUserIds = Array.from(userStats.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([userId]) => userId)

    const { data: userProfiles, error: profilesError } = await supabaseClient
      .from('profiles')
      .select('user_id, email')
      .in('user_id', topUserIds)

    const totalUserRequests = Array.from(userStats.values()).reduce((sum, count) => sum + count, 0)
    const topUsersResult = topUserIds.map(userId => {
      const requests = userStats.get(userId) || 0
      const profile = userProfiles?.find(p => p.user_id === userId)
      return {
        user_id: userId,
        email: profile?.email || 'Unknown',
        requests,
        percentage: Number(((requests / totalUserRequests) * 100).toFixed(1))
      }
    })

    // Process response time distribution
    const responseTimeRanges = [
      { range: '0-100ms', min: 0, max: 100 },
      { range: '100-500ms', min: 100, max: 500 },
      { range: '500-1000ms', min: 500, max: 1000 },
      { range: '1000-2000ms', min: 1000, max: 2000 },
      { range: '2000ms+', min: 2000, max: Infinity }
    ]

    const responseTimeDistribution = responseTimeRanges.map(range => {
      const count = topEndpoints?.filter(log => {
        const responseTime = log.response_time_ms || 0
        return responseTime >= range.min && responseTime < range.max
      }).length || 0

      return {
        range: range.range,
        count,
        percentage: Number(((count / (topEndpoints?.length || 1)) * 100).toFixed(1))
      }
    })

    const result = {
      top_endpoints: topEndpointsResult,
      top_sports: topSportsResult,
      top_users: topUsersResult,
      response_time_distribution: responseTimeDistribution
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in get-sportsgameodds-api-analytics function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
