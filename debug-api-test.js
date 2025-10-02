// Simple test script to debug the API issue
const testAPI = async () => {
  console.log('🔍 Testing SportGameOdds API...');
  
  const url = 'https://rfdrifnsfobqlzorcesn.supabase.co/functions/v1/sportsgameodds-api?sport=nfl&endpoint=player-props';
  
  try {
    console.log('📡 Making request to:', url);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmZHJpZm5zZm9icWx6b3JjZXNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ1NjUxNjcsImV4cCI6MjA1MDE0MTE2N30.kL8Wj8QdWLQpnPEoJKqZSe5HdFvPdcHgkGhPqZEcP3Y'
      }
    });
    
    console.log('📊 Response status:', response.status);
    console.log('📋 Response headers:', Object.fromEntries(response.headers.entries()));
    
    const text = await response.text();
    console.log('📄 Response body:', text);
    
    if (response.status === 546) {
      console.log('🚨 HTTP 546 ERROR DETECTED!');
      console.log('This is not a standard HTTP status code.');
      console.log('Possible causes:');
      console.log('- Custom error from our backend');
      console.log('- Network/proxy issue');
      console.log('- Supabase function error');
    }
    
    try {
      const data = JSON.parse(text);
      console.log('🎯 Parsed JSON:', data);
    } catch (e) {
      console.log('❌ Failed to parse as JSON');
    }
    
  } catch (error) {
    console.log('💥 Request failed:', error.message);
    console.log('🔍 Error details:', error);
  }
};

testAPI();
