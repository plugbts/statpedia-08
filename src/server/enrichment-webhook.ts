#!/usr/bin/env tsx

/**
 * Enrichment Webhook Handler
 * 
 * This endpoint can be called by Hasura cron triggers to refresh player analytics.
 * It calls the refresh_enrichment() function in the database.
 */

import express from 'express';
import cors from 'cors';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

// Import database connection
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';

const connectionString = process.env.NEON_DATABASE_URL;

if (!connectionString) {
  throw new Error('NEON_DATABASE_URL not found in environment variables');
}

const client = postgres(connectionString);
const db = drizzle(client);

const app = express();
const PORT = process.env.ENRICHMENT_WEBHOOK_PORT || 3002;

// Middleware
app.use(cors({
  origin: '*', // Allow Hasura to call this endpoint
  credentials: false
}));
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'enrichment-webhook'
  });
});

// Main enrichment webhook endpoint
app.post('/refresh-enrichment', async (req, res) => {
  const startTime = Date.now();
  
  try {
    console.log('🚀 Enrichment webhook triggered at', new Date().toISOString());
    console.log('📊 Request body:', req.body);
    
    // Call the enrichment function
    const result = await db.execute(sql`
      SELECT * FROM public.refresh_enrichment();
    `);
    
    const enrichmentResult = result[0];
    const executionTime = Date.now() - startTime;
    
    console.log('✅ Enrichment completed:', enrichmentResult);
    
    // Return success response
    res.json({
      success: true,
      message: enrichmentResult.message,
      data: {
        players_processed: enrichmentResult.players_processed,
        analytics_updated: enrichmentResult.analytics_updated,
        execution_time_ms: enrichmentResult.execution_time_ms,
        webhook_execution_time_ms: executionTime
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    console.error('❌ Enrichment webhook failed:', error);
    
    const executionTime = Date.now() - startTime;
    
    res.status(500).json({
      success: false,
      error: error.message,
      execution_time_ms: executionTime,
      timestamp: new Date().toISOString()
    });
  }
});

// GET endpoint for manual testing
app.get('/refresh-enrichment', async (req, res) => {
  const startTime = Date.now();
  
  try {
    console.log('🧪 Manual enrichment trigger at', new Date().toISOString());
    
    // Call the enrichment function
    const result = await db.execute(sql`
      SELECT * FROM public.refresh_enrichment();
    `);
    
    const enrichmentResult = result[0];
    const executionTime = Date.now() - startTime;
    
    console.log('✅ Manual enrichment completed:', enrichmentResult);
    
    // Return success response
    res.json({
      success: true,
      message: enrichmentResult.message,
      data: {
        players_processed: enrichmentResult.players_processed,
        analytics_updated: enrichmentResult.analytics_updated,
        execution_time_ms: enrichmentResult.execution_time_ms,
        webhook_execution_time_ms: executionTime
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    console.error('❌ Manual enrichment failed:', error);
    
    const executionTime = Date.now() - startTime;
    
    res.status(500).json({
      success: false,
      error: error.message,
      execution_time_ms: executionTime,
      timestamp: new Date().toISOString()
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Enrichment webhook server running on port ${PORT}`);
  console.log(`📡 Health check: http://localhost:${PORT}/health`);
  console.log(`🔄 Enrichment endpoint: http://localhost:${PORT}/refresh-enrichment`);
  console.log(`🧪 Manual test: http://localhost:${PORT}/refresh-enrichment (GET)`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down enrichment webhook server...');
  await client.end();
  process.exit(0);
});

export default app;
