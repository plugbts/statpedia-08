import { db } from './index';
import { leagues, teams, players, propTypes } from './schema';
import { eq } from 'drizzle-orm';

// Seed data for initial setup
export async function seedDatabase() {
  try {
    console.log('🌱 Seeding database...');

    // Insert leagues
    const nbaLeague = await db.insert(leagues).values({
      name: 'National Basketball Association',
      abbreviation: 'NBA',
      sport: 'nba',
      season: '2024-25',
      isActive: true,
      totalTeams: 30,
      playoffTeams: 16,
    }).returning();

    const nflLeague = await db.insert(leagues).values({
      name: 'National Football League',
      abbreviation: 'NFL',
      sport: 'nfl',
      season: '2024',
      isActive: true,
      totalTeams: 32,
      playoffTeams: 14,
    }).returning();

    console.log('✅ Leagues seeded');

    // Insert sample NBA teams
    const lakers = await db.insert(teams).values({
      leagueId: nbaLeague[0].id,
      name: 'Lakers',
      abbreviation: 'LAL',
      city: 'Los Angeles',
      fullName: 'Los Angeles Lakers',
      conference: 'Western',
      division: 'Pacific',
      isActive: true,
    }).returning();

    const warriors = await db.insert(teams).values({
      leagueId: nbaLeague[0].id,
      name: 'Warriors',
      abbreviation: 'GSW',
      city: 'San Francisco',
      fullName: 'Golden State Warriors',
      conference: 'Western',
      division: 'Pacific',
      isActive: true,
    }).returning();

    console.log('✅ Teams seeded');

    // Insert sample players
    const lebron = await db.insert(players).values({
      teamId: lakers[0].id,
      firstName: 'LeBron',
      lastName: 'James',
      fullName: 'LeBron James',
      position: 'SF',
      positionCategory: 'Forward',
      jerseyNumber: 6,
      height: 81, // 6'9"
      weight: 250,
      age: 39,
      experience: 21,
      isActive: true,
      isInjured: false,
      injuryStatus: 'Healthy',
    }).returning();

    const curry = await db.insert(players).values({
      teamId: warriors[0].id,
      firstName: 'Stephen',
      lastName: 'Curry',
      fullName: 'Stephen Curry',
      position: 'PG',
      positionCategory: 'Guard',
      jerseyNumber: 30,
      height: 75, // 6'3"
      weight: 190,
      age: 35,
      experience: 15,
      isActive: true,
      isInjured: false,
      injuryStatus: 'Healthy',
    }).returning();

    console.log('✅ Players seeded');

    // Insert prop types
    const pointsProp = await db.insert(propTypes).values({
      name: 'Points',
      category: 'scoring',
      sport: 'nba',
      unit: 'points',
      isOverUnder: true,
      isActive: true,
    }).returning();

    const reboundsProp = await db.insert(propTypes).values({
      name: 'Rebounds',
      category: 'rebounds',
      sport: 'nba',
      unit: 'rebounds',
      isOverUnder: true,
      isActive: true,
    }).returning();

    const assistsProp = await db.insert(propTypes).values({
      name: 'Assists',
      category: 'assists',
      sport: 'nba',
      unit: 'assists',
      isOverUnder: true,
      isActive: true,
    }).returning();

    const threesProp = await db.insert(propTypes).values({
      name: '3-Pointers Made',
      category: 'scoring',
      sport: 'nba',
      unit: 'threes',
      isOverUnder: true,
      isActive: true,
    }).returning();

    console.log('✅ Prop types seeded');
    console.log('🎉 Database seeding completed successfully!');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  }
}

// Run seeding if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
