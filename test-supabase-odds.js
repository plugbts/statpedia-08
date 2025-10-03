// Test Supabase Edge Function for odds
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://rfdrifnsfobqlzorcesn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmZHJpZm5zZm9icWx6b3JjZXNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwNDg4MzYsImV4cCI6MjA3NDYyNDgzNn0.oUzP1pTapCMEaaPXzia2uqn-m3L9BRR82_RYcUXqykI';

async function testSupabaseOdds() {
  console.log('🧪 Testing Supabase Edge Function for odds...');
  
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { data, error } = await supabase.functions.invoke('fetch-odds', {
      body: { endpoint: 'sports' }
    });
    
    if (error) {
      console.error('❌ Supabase Error:', error);
      return;
    }
    
    console.log('✅ Supabase Response:', JSON.stringify(data, null, 2));
    
  } catch (error) {
    console.error('❌ Network Error:', error);
  }
}

testSupabaseOdds();
