import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkTableSchema() {
  console.log("🔍 Checking prop_type_aliases table schema...");
  
  try {
    // Try to get one row to see the structure
    const { data, error } = await supabase
      .from('prop_type_aliases')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error("❌ Error accessing table:", error);
      return;
    }
    
    if (data && data.length > 0) {
      console.log("📊 Table structure (from sample row):");
      console.log(JSON.stringify(data[0], null, 2));
    } else {
      console.log("📊 Table is empty, trying to insert a test row...");
      
      // Try inserting with minimal fields
      const { error: insertError } = await supabase
        .from('prop_type_aliases')
        .insert([{ alias: 'test', canonical: 'test_canonical' }]);
      
      if (insertError) {
        console.error("❌ Error inserting test row:", insertError);
      } else {
        console.log("✅ Test row inserted successfully");
        
        // Get the structure now
        const { data: testData } = await supabase
          .from('prop_type_aliases')
          .select('*')
          .limit(1);
        
        console.log("📊 Table structure (from test row):");
        console.log(JSON.stringify(testData?.[0], null, 2));
        
        // Clean up test row
        await supabase
          .from('prop_type_aliases')
          .delete()
          .eq('alias', 'test');
      }
    }
    
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

checkTableSchema().catch(console.error);
