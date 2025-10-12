#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function fixDavanteAdamsTeam() {
  console.log('🔍 Checking current Davante Adams data...');
  
  try {
    // Check current data
    const { data: currentData, error: selectError } = await supabase
      .from('players')
      .select('*')
      .ilike('full_name', '%Davante Adams%');
    
    if (selectError) {
      console.error('❌ Error fetching current data:', selectError);
      return;
    }
    
    console.log('📊 Current Davante Adams data:', currentData);
    
    if (currentData && currentData.length > 0) {
      const davante = currentData[0];
      console.log(`Current team: ${davante.team}`);
      
      if (davante.team === 'LV' || davante.team === 'LAS VEGAS RAIDERS') {
        console.log('🔄 Updating Davante Adams from LV to LA Rams...');
        
        // Update to LA Rams
        const { data: updateData, error: updateError } = await supabase
          .from('players')
          .update({ 
            team: 'LAR',  // LA Rams abbreviation
            player_id: 'DAVANTE_ADAMS-WR-LAR'  // Update player_id to reflect new team
          })
          .eq('player_id', davante.player_id)
          .select();
        
        if (updateError) {
          console.error('❌ Error updating:', updateError);
        } else {
          console.log('✅ Successfully updated Davante Adams to LA Rams:', updateData);
        }
      } else {
        console.log(`✅ Davante Adams is already on the correct team: ${davante.team}`);
      }
    } else {
      console.log('❌ No Davante Adams found in players table');
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

fixDavanteAdamsTeam();
