/**
 * Sync with Postman Workspace
 * Connects to your Postman workspace and tests our APIs
 */

const fs = require('fs');
const path = require('path');

// Load configuration
const config = JSON.parse(fs.readFileSync('postman-config.json', 'utf8'));

console.log('🔗 Connecting to Your Postman Workspace\n');
console.log(`📋 Workspace: ${config.workspace.name}`);
console.log(`🔗 URL: ${config.workspace.url}`);
console.log(`📁 Collection: ${config.collection.name}\n`);

// Test function
async function testEndpoint(endpoint) {
  console.log(`🧪 Testing ${endpoint.name}...`);
  
  // Replace variables in URL
  let url = endpoint.url;
  Object.entries(config.environment.variables).forEach(([key, value]) => {
    url = url.replace(`{{${key}}}`, value);
  });
  
  console.log(`URL: ${url}`);
  
  try {
    const response = await fetch(url, {
      method: endpoint.method,
      headers: endpoint.headers
    });
    
    const status = response.status;
    const expectedStatuses = Array.isArray(endpoint.expected_status) ? endpoint.expected_status : [endpoint.expected_status];
    const isExpected = expectedStatuses.includes(status);
    
    console.log(`Status: ${status} ${isExpected ? '✅' : '❌'}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ Success - Response structure:`, Object.keys(data));
      
      // Analyze response based on endpoint type
      if (endpoint.name.includes('Schedule')) {
        if (data.weeks) {
          console.log(`📅 Found ${data.weeks.length} weeks (NFL structure)`);
        } else if (data.games) {
          console.log(`🎮 Found ${data.games.length} games`);
        }
      } else if (endpoint.name.includes('Player Props')) {
        if (data.player_props) {
          console.log(`⚽ Found ${data.player_props.length} player props`);
        } else if (data.games) {
          console.log(`🎮 Found ${data.games.length} games`);
        }
      } else if (endpoint.name.includes('Books')) {
        if (data.books) {
          console.log(`📚 Found ${data.books.length} bookmakers`);
        }
      }
    } else {
      const errorText = await response.text();
      console.log(`❌ Error: ${status} - ${errorText.substring(0, 200)}...`);
    }
    
    return {
      name: endpoint.name,
      status: status,
      success: isExpected,
      url: url,
      category: endpoint.name.includes('Schedule') ? 'core' : 
                endpoint.name.includes('Player Props') ? 'props' : 'odds'
    };
    
  } catch (error) {
    console.log(`❌ Network Error: ${error.message}`);
    return {
      name: endpoint.name,
      status: 'ERROR',
      success: false,
      url: url,
      error: error.message,
      category: 'error'
    };
  }
}

// Generate Postman collection for your workspace
function generatePostmanCollection() {
  const collection = {
    info: {
      name: "Statpedia Sports APIs - Cursor Sync",
      description: "Collection synced with Cursor development environment",
      schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
    },
    variable: Object.entries(config.environment.variables).map(([key, value]) => ({
      key: key,
      value: value,
      type: "string"
    })),
    item: [
      {
        name: "Working APIs",
        item: config.endpoints.working.map(endpoint => ({
          name: endpoint.name,
          request: {
            method: endpoint.method,
            header: Object.entries(endpoint.headers).map(([key, value]) => ({
              key: key,
              value: value,
              type: "text"
            })),
            url: {
              raw: endpoint.url,
              protocol: endpoint.url.split('://')[0],
              host: endpoint.url.split('://')[1].split('/'),
              path: endpoint.url.split('/').slice(3)
            }
          }
        }))
      },
      {
        name: "Testing APIs",
        item: config.endpoints.testing.map(endpoint => ({
          name: endpoint.name,
          request: {
            method: endpoint.method,
            header: Object.entries(endpoint.headers).map(([key, value]) => ({
              key: key,
              value: value,
              type: "text"
            })),
            url: {
              raw: endpoint.url,
              protocol: endpoint.url.split('://')[0],
              host: endpoint.url.split('://')[1].split('/'),
              path: endpoint.url.split('/').slice(3)
            }
          }
        }))
      },
      {
        name: "Backend APIs",
        item: config.endpoints.backend.map(endpoint => ({
          name: endpoint.name,
          request: {
            method: endpoint.method,
            header: Object.entries(endpoint.headers).map(([key, value]) => ({
              key: key,
              value: value,
              type: "text"
            })),
            url: {
              raw: endpoint.url,
              protocol: endpoint.url.split('://')[0],
              host: endpoint.url.split('://')[1].split('/'),
              path: endpoint.url.split('/').slice(3)
            }
          }
        }))
      }
    ]
  };
  
  return collection;
}

// Main sync function
async function syncWithPostman() {
  console.log('🚀 Syncing with Postman Workspace\n');
  
  // Test all endpoints
  const allEndpoints = [
    ...config.endpoints.working,
    ...config.endpoints.testing,
    ...config.endpoints.backend
  ];
  
  console.log('🧪 Testing All Endpoints...\n');
  
  const results = [];
  for (const endpoint of allEndpoints) {
    const result = await testEndpoint(endpoint);
    results.push(result);
    console.log('---\n');
  }
  
  // Categorize results
  const coreResults = results.filter(r => r.category === 'core');
  const propsResults = results.filter(r => r.category === 'props');
  const oddsResults = results.filter(r => r.category === 'odds');
  const backendResults = results.filter(r => r.category === 'error' && r.name.includes('Player Props'));
  
  // Summary
  console.log('📊 Test Results Summary\n');
  
  console.log('✅ Core APIs (Schedule endpoints):');
  coreResults.forEach(result => {
    console.log(`  ${result.success ? '✅' : '❌'} ${result.name}: ${result.status}`);
  });
  
  console.log('\n⚠️ Odds/Props APIs (May require different permissions):');
  [...propsResults, ...oddsResults].forEach(result => {
    console.log(`  ${result.success ? '✅' : '❌'} ${result.name}: ${result.status}`);
  });
  
  console.log('\n🔧 Backend APIs (Need dev server running):');
  backendResults.forEach(result => {
    console.log(`  ${result.success ? '✅' : '❌'} ${result.name}: ${result.status}`);
  });
  
  // Generate collection
  const collection = generatePostmanCollection();
  fs.writeFileSync('postman-workspace-collection.json', JSON.stringify(collection, null, 2));
  
  console.log('\n📁 Generated postman-workspace-collection.json');
  console.log('💡 Import this file into your Postman workspace for easy testing');
  
  // Instructions
  console.log('\n🎯 Next Steps:');
  console.log('1. Import postman-workspace-collection.json into your Postman workspace');
  console.log('2. Set up environment variables in Postman:');
  Object.entries(config.environment.variables).forEach(([key, value]) => {
    console.log(`   - ${key}: ${value}`);
  });
  console.log('3. Test the endpoints in Postman');
  console.log('4. Use the working endpoints in our backend');
  
  console.log('\n🔗 Your Postman Workspace:');
  console.log(`   ${config.workspace.url}`);
  
  return results;
}

// Run the sync
if (require.main === module) {
  syncWithPostman().catch(console.error);
}

module.exports = {
  syncWithPostman,
  testEndpoint,
  generatePostmanCollection,
  config
};
