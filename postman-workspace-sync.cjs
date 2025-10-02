/**
 * Postman Workspace Sync
 * Creates a collection for your specific Postman workspace
 */

const fs = require('fs');

// Your Postman workspace configuration
const WORKSPACE_CONFIG = {
  workspaceId: '4f4e954c-f368-4c54-b419-e3b4206b3f36',
  collectionId: '48955153-9a828761-a669-47c8-893d-2d26b5c645ef',
  workspaceUrl: 'https://lifesplugg-9889449.postman.co/workspace/Statpedia~4f4e954c-f368-4c54-b419-e3b4206b3f36'
};

// Generate Postman collection for your workspace
function generatePostmanCollection() {
  const collection = {
    info: {
      name: "Statpedia Sports APIs - Cursor Integration",
      description: "Collection synced with Cursor development environment for Statpedia project",
      schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
      version: "1.0.0"
    },
    variable: [
      {
        key: "base_url",
        value: "https://api.sportradar.com",
        type: "string"
      },
      {
        key: "sportsradar_api_key",
        value: "onLEN0JXRxK7h3OmgCSPOnbkgVvodnrIx1lD4M4D",
        type: "string"
      },
      {
        key: "current_year",
        value: "2025",
        type: "string"
      },
      {
        key: "current_date",
        value: "2025-01-05",
        type: "string"
      },
      {
        key: "dev_server_url",
        value: "http://localhost:8084",
        type: "string"
      }
    ],
    item: [
      {
        name: "SportsRadar Core APIs",
        description: "Working SportsRadar schedule endpoints",
        item: [
          {
            name: "NFL Schedule 2025",
            request: {
              method: "GET",
              header: [
                {
                  key: "x-api-key",
                  value: "{{sportsradar_api_key}}",
                  type: "text"
                },
                {
                  key: "accept",
                  value: "application/json",
                  type: "text"
                }
              ],
              url: {
                raw: "{{base_url}}/nfl/official/trial/v7/en/games/{{current_year}}/REG/schedule.json",
                protocol: "https",
                host: ["api", "sportradar", "com"],
                path: ["nfl", "official", "trial", "v7", "en", "games", "{{current_year}}", "REG", "schedule.json"]
              }
            }
          },
          {
            name: "NBA Schedule 2025",
            request: {
              method: "GET",
              header: [
                {
                  key: "x-api-key",
                  value: "{{sportsradar_api_key}}",
                  type: "text"
                },
                {
                  key: "accept",
                  value: "application/json",
                  type: "text"
                }
              ],
              url: {
                raw: "{{base_url}}/nba/trial/v7/en/games/{{current_year}}/REG/schedule.json",
                protocol: "https",
                host: ["api", "sportradar", "com"],
                path: ["nba", "trial", "v7", "en", "games", "{{current_year}}", "REG", "schedule.json"]
              }
            }
          },
          {
            name: "MLB Schedule 2025",
            request: {
              method: "GET",
              header: [
                {
                  key: "x-api-key",
                  value: "{{sportsradar_api_key}}",
                  type: "text"
                },
                {
                  key: "accept",
                  value: "application/json",
                  type: "text"
                }
              ],
              url: {
                raw: "{{base_url}}/mlb/trial/v7/en/games/{{current_year}}/REG/schedule.json",
                protocol: "https",
                host: ["api", "sportradar", "com"],
                path: ["mlb", "trial", "v7", "en", "games", "{{current_year}}", "REG", "schedule.json"]
              }
            }
          },
          {
            name: "NHL Schedule 2025",
            request: {
              method: "GET",
              header: [
                {
                  key: "x-api-key",
                  value: "{{sportsradar_api_key}}",
                  type: "text"
                },
                {
                  key: "accept",
                  value: "application/json",
                  type: "text"
                }
              ],
              url: {
                raw: "{{base_url}}/nhl/trial/v7/en/games/{{current_year}}/REG/schedule.json",
                protocol: "https",
                host: ["api", "sportradar", "com"],
                path: ["nhl", "trial", "v7", "en", "games", "{{current_year}}", "REG", "schedule.json"]
              }
            }
          }
        ]
      },
      {
        name: "SportsRadar Odds APIs",
        description: "SportsRadar odds and player props endpoints (may require different permissions)",
        item: [
          {
            name: "Books (Bookmakers)",
            request: {
              method: "GET",
              header: [
                {
                  key: "x-api-key",
                  value: "{{sportsradar_api_key}}",
                  type: "text"
                },
                {
                  key: "accept",
                  value: "application/json",
                  type: "text"
                }
              ],
              url: {
                raw: "{{base_url}}/oddscomparison/v1/en/books.json",
                protocol: "https",
                host: ["api", "sportradar", "com"],
                path: ["oddscomparison", "v1", "en", "books.json"]
              }
            }
          },
          {
            name: "NFL Player Props",
            request: {
              method: "GET",
              header: [
                {
                  key: "x-api-key",
                  value: "{{sportsradar_api_key}}",
                  type: "text"
                },
                {
                  key: "accept",
                  value: "application/json",
                  type: "text"
                }
              ],
              url: {
                raw: "{{base_url}}/oddscomparison/v1/en/sports/1/player_props.json",
                protocol: "https",
                host: ["api", "sportradar", "com"],
                path: ["oddscomparison", "v1", "en", "sports", "1", "player_props.json"]
              }
            }
          },
          {
            name: "NBA Player Props",
            request: {
              method: "GET",
              header: [
                {
                  key: "x-api-key",
                  value: "{{sportsradar_api_key}}",
                  type: "text"
                },
                {
                  key: "accept",
                  value: "application/json",
                  type: "text"
                }
              ],
              url: {
                raw: "{{base_url}}/oddscomparison/v1/en/sports/2/player_props.json",
                protocol: "https",
                host: ["api", "sportradar", "com"],
                path: ["oddscomparison", "v1", "en", "sports", "2", "player_props.json"]
              }
            }
          }
        ]
      },
      {
        name: "Statpedia Backend APIs",
        description: "Our custom backend endpoints for testing",
        item: [
          {
            name: "Get Player Props (NFL)",
            request: {
              method: "GET",
              header: [
                {
                  key: "accept",
                  value: "application/json",
                  type: "text"
                }
              ],
              url: {
                raw: "{{dev_server_url}}/api/player-props?sport=nfl",
                protocol: "http",
                host: ["localhost"],
                port: "8084",
                path: ["api", "player-props"],
                query: [
                  {
                    key: "sport",
                    value: "nfl"
                  }
                ]
              }
            }
          },
          {
            name: "Get Player Props (NBA)",
            request: {
              method: "GET",
              header: [
                {
                  key: "accept",
                  value: "application/json",
                  type: "text"
                }
              ],
              url: {
                raw: "{{dev_server_url}}/api/player-props?sport=nba",
                protocol: "http",
                host: ["localhost"],
                port: "8084",
                path: ["api", "player-props"],
                query: [
                  {
                    key: "sport",
                    value: "nba"
                  }
                ]
              }
            }
          },
          {
            name: "Test SportsRadar Backend",
            request: {
              method: "GET",
              header: [
                {
                  key: "accept",
                  value: "application/json",
                  type: "text"
                }
              ],
              url: {
                raw: "{{dev_server_url}}/api/sportsradar/test",
                protocol: "http",
                host: ["localhost"],
                port: "8084",
                path: ["api", "sportsradar", "test"]
              }
            }
          }
        ]
      }
    ]
  };
  
  return collection;
}

// Generate environment file
function generateEnvironment() {
  const environment = {
    id: "statpedia-dev-env",
    name: "Statpedia Development",
    values: [
      {
        key: "base_url",
        value: "https://api.sportradar.com",
        enabled: true
      },
      {
        key: "sportsradar_api_key",
        value: "onLEN0JXRxK7h3OmgCSPOnbkgVvodnrIx1lD4M4D",
        enabled: true
      },
      {
        key: "current_year",
        value: "2025",
        enabled: true
      },
      {
        key: "current_date",
        value: "2025-01-05",
        enabled: true
      },
      {
        key: "dev_server_url",
        value: "http://localhost:8083",
        enabled: true
      }
    ]
  };
  
  return environment;
}

// Main function
function syncWithPostmanWorkspace() {
  console.log('🔗 Postman Workspace Sync\n');
  console.log(`📋 Workspace: Statpedia`);
  console.log(`🔗 URL: ${WORKSPACE_CONFIG.workspaceUrl}`);
  console.log(`📁 Collection ID: ${WORKSPACE_CONFIG.collectionId}\n`);
  
  // Generate collection
  const collection = generatePostmanCollection();
  fs.writeFileSync('statpedia-postman-collection.json', JSON.stringify(collection, null, 2));
  
  // Generate environment
  const environment = generateEnvironment();
  fs.writeFileSync('statpedia-postman-environment.json', JSON.stringify(environment, null, 2));
  
  console.log('✅ Generated Files:');
  console.log('📁 statpedia-postman-collection.json - Import this into your Postman workspace');
  console.log('📁 statpedia-postman-environment.json - Import this as an environment in Postman\n');
  
  console.log('🎯 Next Steps:');
  console.log('1. Open your Postman workspace:');
  console.log(`   ${WORKSPACE_CONFIG.workspaceUrl}`);
  console.log('2. Import statpedia-postman-collection.json into your collection');
  console.log('3. Import statpedia-postman-environment.json as an environment');
  console.log('4. Set the environment as active');
  console.log('5. Test the endpoints in Postman\n');
  
  console.log('📊 Collection Structure:');
  console.log('✅ SportsRadar Core APIs - Schedule endpoints (should work)');
  console.log('⚠️ SportsRadar Odds APIs - May require different permissions');
  console.log('🔧 Statpedia Backend APIs - Our custom endpoints\n');
  
  console.log('💡 Pro Tips:');
  console.log('- Use environment variables for easy API key management');
  console.log('- Set up automated tests in Postman');
  console.log('- Use Postman monitors for API health checks');
  console.log('- Export collection for team sharing');
  
  return {
    collection,
    environment,
    workspaceConfig: WORKSPACE_CONFIG
  };
}

// Run the sync
if (require.main === module) {
  syncWithPostmanWorkspace();
}

module.exports = {
  syncWithPostmanWorkspace,
  generatePostmanCollection,
  generateEnvironment,
  WORKSPACE_CONFIG
};
