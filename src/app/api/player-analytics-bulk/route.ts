import { NextRequest, NextResponse } from 'next/server';
import { config } from 'dotenv';
import { resolve } from 'path';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

const connectionString = process.env.NEON_DATABASE_URL;

if (!connectionString) {
  throw new Error('NEON_DATABASE_URL not found in environment variables');
}

const client = postgres(connectionString);
const db = drizzle(client);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { playerIds, propType, sport = '2024-25' } = body;

    if (!playerIds || !Array.isArray(playerIds) || !propType) {
      return NextResponse.json(
        { error: 'playerIds array and propType are required' },
        { status: 400 }
      );
    }

    // Fetch bulk analytics from the player_analytics table
    const analyticsResult = await db.execute(sql`
      SELECT * FROM public.player_analytics
      WHERE player_id = ANY(${playerIds})
      AND prop_type = ${propType}
      AND sport = ${sport};
    `);

    return NextResponse.json({
      analytics: analyticsResult,
    });

  } catch (error: any) {
    console.error('Error fetching bulk enriched player analytics:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
