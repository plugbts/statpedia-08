import { createClient } from "@supabase/supabase-js";
import fs from 'fs';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function setupPropTypeAliases() {
  console.log("🔧 Setting up prop_type_aliases table...");
  
  try {
    // Read the SQL migration file
    const sqlContent = fs.readFileSync('create-prop-type-aliases-table.sql', 'utf8');
    
    // Execute the SQL
    const { error } = await supabase.rpc('exec_sql', { sql: sqlContent });
    
    if (error) {
      console.error("❌ Error executing SQL:", error);
      return;
    }
    
    console.log("✅ prop_type_aliases table created successfully");
    
    // Verify the table was created and has data
    const { data, error: selectError } = await supabase
      .from("prop_type_aliases")
      .select("alias, canonical, league")
      .limit(5);
    
    if (selectError) {
      console.error("❌ Error selecting from prop_type_aliases:", selectError);
      return;
    }
    
    console.log("📊 Sample prop type aliases:");
    data?.forEach((row, i) => {
      console.log(`${i + 1}. ${row.alias} → ${row.canonical} (${row.league})`);
    });
    
    console.log(`✅ Setup complete! Total aliases: ${data?.length || 0}`);
    
  } catch (error) {
    console.error("❌ Setup failed:", error);
  }
}

setupPropTypeAliases().catch(console.error);
