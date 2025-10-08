/**
 * Test prop type normalization to see what's happening
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

function normalizeMarketType(market) {
  if (!market) return '';
  const lower = market.toLowerCase();
  
  // Remove common suffixes that don't affect the core prop type
  const cleaned = lower
    .replace(/\s+over\/under\s*$/i, '')
    .replace(/\s+over\s*$/i, '')
    .replace(/\s+under\s*$/i, '')
    .replace(/\s+1st\s+half\s*/i, '')
    .replace(/\s+2nd\s+half\s*/i, '')
    .replace(/\s+first\s+half\s*/i, '')
    .replace(/\s+second\s+half\s*/i, '')
    .trim();
  
  // Prioritized pattern matching for core prop types
  if (cleaned.includes('receiving') && cleaned.includes('yard')) return 'Receiving Yards';
  if (cleaned.includes('receptions')) return 'Receptions';
  if (cleaned.includes('rush') && cleaned.includes('yard')) return 'Rushing Yards';
  if (cleaned.includes('pass') && cleaned.includes('yard')) return 'Passing Yards';
  if (cleaned.includes('passing') && cleaned.includes('completion')) return 'Passing Completions';
  if (cleaned.includes('passing') && cleaned.includes('attempt')) return 'Passing Attempts';
  if (cleaned.includes('receiving') && cleaned.includes('touchdown')) return 'Receiving Touchdowns';
  if (cleaned.includes('rushing') && cleaned.includes('touchdown')) return 'Rushing Touchdowns';
  if (cleaned.includes('passing') && cleaned.includes('touchdown')) return 'Passing Touchdowns';
  if (cleaned.includes('touchdown')) return 'Touchdowns';
  
  return market.trim();
}

async function testPropNormalization() {
  console.log('🧪 Testing Prop Type Normalization');
  console.log('='.repeat(50));

  try {
    // Get some sample prop lines to test normalization
    const { data: propLines, error: propLinesError } = await supabase
      .from('proplines')
      .select('player_name, prop_type, player_id')
      .limit(20);

    if (propLinesError) {
      console.error('❌ Error fetching prop lines:', propLinesError);
      return;
    }

    console.log('\n📊 Sample Prop Lines and Their Normalization:');
    propLines?.forEach((prop, i) => {
      const normalized = normalizeMarketType(prop.prop_type);
      console.log(`${i + 1}. ${prop.player_name}`);
      console.log(`   Original: "${prop.prop_type}"`);
      console.log(`   Normalized: "${normalized}"`);
      console.log(`   Player ID: ${prop.player_id}`);
      console.log('');
    });

    // Check what prop types we have in game logs
    console.log('\n📊 Game Logs Prop Types:');
    const { data: gameLogsProps, error: gameLogsPropsError } = await supabase
      .from('playergamelogs')
      .select('prop_type')
      .limit(10);

    if (gameLogsPropsError) {
      console.error('❌ Error fetching game logs props:', gameLogsPropsError);
    } else {
      const gameLogsPropTypes = [...new Set(gameLogsProps?.map(p => p.prop_type) || [])];
      console.log(`Found ${gameLogsPropTypes.length} unique prop types in game logs:`);
      gameLogsPropTypes.forEach(prop => console.log(`   - "${prop}"`));
    }

    // Check for JAXON SMITHNJIGBA specifically
    console.log('\n🎯 JAXON SMITHNJIGBA Analysis:');
    const { data: jaxonProps, error: jaxonPropsError } = await supabase
      .from('proplines')
      .select('player_name, prop_type, player_id')
      .or('player_name.ilike.%jaxon%')
      .limit(10);

    if (jaxonPropsError) {
      console.error('❌ Error fetching Jaxon props:', jaxonPropsError);
    } else {
      console.log(`Found ${jaxonProps?.length || 0} prop lines for JAXON SMITHNJIGBA:`);
      jaxonProps?.forEach(prop => {
        const normalized = normalizeMarketType(prop.prop_type);
        console.log(`   - "${prop.prop_type}" → "${normalized}"`);
        console.log(`     Player ID: ${prop.player_id}`);
      });
    }

    console.log('\n🎉 Prop normalization test complete!');
    console.log('='.repeat(50));

  } catch (error) {
    console.error('❌ Fatal error during prop normalization test:', error);
  }
}

testPropNormalization().catch(console.error);
