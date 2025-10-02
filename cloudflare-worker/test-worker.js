// Test script for the deployed Cloudflare Worker
const testWorker = async () => {
  // Try different possible URLs
  const possibleUrls = [
    'https://statpedia-player-props.lifesplugg.workers.dev',
    'https://statpedia-player-props-staging.lifesplugg.workers.dev',
    'https://statpedia-player-props.c9894e3058e9bf627cc0cbaf9f04b498.workers.dev',
    'https://statpedia-player-props-staging.c9894e3058e9bf627cc0cbaf9f04b498.workers.dev'
  ];

  console.log('🧪 Testing Cloudflare Worker URLs...');

  for (const url of possibleUrls) {
    try {
      console.log(`\n🔍 Testing: ${url}`);
      
      const response = await fetch(`${url}/api/player-props?sport=nfl`);
      const data = await response.json();
      
      console.log(`✅ SUCCESS! Status: ${response.status}`);
      console.log(`📊 Response:`, {
        success: data.success,
        totalProps: data.totalProps || data.data?.length || 0,
        cached: data.cached,
        responseTime: data.responseTime
      });
      
      if (data.data && data.data.length > 0) {
        console.log(`🎉 Player props working! Sample prop:`, data.data[0]);
        return url; // Return the working URL
      }
      
    } catch (error) {
      console.log(`❌ Failed: ${error.message}`);
    }
  }
  
  console.log('\n⚠️ None of the URLs worked. Check the Cloudflare dashboard for the correct URL.');
  return null;
};

testWorker().then(workingUrl => {
  if (workingUrl) {
    console.log(`\n🎯 Working URL: ${workingUrl}`);
    console.log(`📝 Update your frontend service with this URL!`);
  }
});
