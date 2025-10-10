// Test script to check if the new player_props_fixed view is working
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://rfdrifnsfobqlzorcesn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmZHJpZm5zZm9icWx6b3JjZXNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU4NDQ0NzAsImV4cCI6MjA1MTQyMDQ3MH0.t4kXqJYkF4J8Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testNewView() {
  console.log('🔍 Testing player_props_fixed view...');
  
  try {
    // Test 1: Check if view exists and has data
    const { data, error } = await supabase
      .from('player_props_fixed')
      .select('*')
      .limit(5);
    
    if (error) {
      console.error('❌ Error querying view:', error);
      return;
    }
    
    console.log('✅ View exists and returned data:', data?.length || 0, 'rows');
    if (data && data.length > 0) {
      console.log('📋 Sample row:', JSON.stringify(data[0], null, 2));
    }
    
    // Test 2: Check for today's data
    const today = new Date().toISOString().split('T')[0];
    const { data: todayData, error: todayError } = await supabase
      .from('player_props_fixed')
      .select('*')
      .eq('prop_date', today)
      .limit(3);
    
    if (todayError) {
      console.error('❌ Error querying today\'s data:', todayError);
    } else {
      console.log('📅 Today\'s data:', todayData?.length || 0, 'rows');
      if (todayData && todayData.length > 0) {
        console.log('📋 Today\'s sample:', JSON.stringify(todayData[0], null, 2));
      }
    }
    
    // Test 3: Check original view for comparison
    const { data: originalData, error: originalError } = await supabase
      .from('player_props_api_view')
      .select('*')
      .limit(3);
    
    if (originalError) {
      console.error('❌ Error querying original view:', originalError);
    } else {
      console.log('📊 Original view data:', originalData?.length || 0, 'rows');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testNewView();
