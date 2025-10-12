# Drizzle Schema Guide for StatPedia

This guide explains the clean, normalized database schema designed for StatPedia using Drizzle ORM with Neon Database.

## 🏗️ Schema Architecture

### Core Entities

#### 1. **Leagues** (`leagues`)
- Represents sports leagues (NBA, NFL, MLB, NHL)
- Contains league metadata, seasons, and configuration
- **Key Fields**: `name`, `abbreviation`, `sport`, `season`, `isActive`

#### 2. **Teams** (`teams`)
- Teams within each league
- Includes team metadata, performance stats, and visual branding
- **Key Fields**: `name`, `abbreviation`, `city`, `conference`, `division`
- **Relationships**: Belongs to a league

#### 3. **Players** (`players`)
- Individual players with comprehensive stats and metadata
- Includes physical attributes, performance metrics, and injury status
- **Key Fields**: `firstName`, `lastName`, `position`, `teamId`, `isActive`
- **Relationships**: Belongs to a team

#### 4. **Games** (`games`)
- Game schedules and results
- Contains scores, venue info, and game context
- **Key Fields**: `homeTeamId`, `awayTeamId`, `gameDate`, `status`
- **Relationships**: References league, home team, and away team

### Prop Betting System

#### 5. **Prop Types** (`prop_types`)
- Defines available prop bet types (Points, Rebounds, Assists, etc.)
- Categorized by sport and betting type
- **Key Fields**: `name`, `category`, `sport`, `unit`

#### 6. **Player Props** (`player_props`)
- Individual prop bets for players in specific games
- Contains lines, odds, and analytics
- **Key Fields**: `playerId`, `gameId`, `propTypeId`, `line`, `odds`
- **Analytics**: Hit rate, historical averages, advanced metrics

### Analytics & Performance

#### 7. **Player Analytics** (`player_analytics`)
- Game-by-game performance tracking
- Links actual results to prop bets
- **Key Fields**: `actualValue`, `propLine`, `result`, `margin`

#### 8. **Player Streaks** (`player_streaks`)
- Tracks over/under streaks for players
- Performance analytics during streaks
- **Key Fields**: `currentStreak`, `longestStreak`, `streakType`

#### 9. **Team Analytics** (`team_analytics`)
- Team-level performance metrics
- Pace, offensive/defensive ratings
- **Key Fields**: `pace`, `offensiveRating`, `defensiveRating`

#### 10. **Prop Analytics** (`prop_analytics`)
- Historical performance by prop type and player
- Hit rates, margins, and trend analysis
- **Key Fields**: `hitRate`, `overRate`, `underRate`, `avgMargin`

### User Management

#### 11. **Profiles** (`profiles`)
- User profiles with subscription management
- Betting stats and preferences
- **Key Fields**: `userId`, `subscriptionTier`, `bankroll`

#### 12. **Social Features**
- `social_posts`: User-generated content
- `comments`: Comments on posts and props
- `votes`: Upvote/downvote system
- `friendships`: User connections

#### 13. **Betting & Predictions**
- `user_predictions`: User prop predictions
- `bet_tracking`: Bet history and results
- `promo_codes`: Promotional codes and usage

## 🚀 Getting Started

### 1. Environment Setup

Create a `.env.local` file:

```env
NEON_DATABASE_URL="postgresql://username:password@ep-xxx.us-east-1.aws.neon.tech/statpedia?sslmode=require"
```

### 2. Database Operations

```bash
# Generate migrations from schema changes
npm run db:generate

# Push schema to database (development)
npm run db:push

# Run migrations (production)
npm run db:migrate

# Open Drizzle Studio (database GUI)
npm run db:studio

# Seed database with initial data
npm run db:seed
```

### 3. Using the Schema

```typescript
import { db } from './src/db';
import { players, teams, playerProps } from './src/db/schema';
import { eq, and, desc } from 'drizzle-orm';

// Get active players for a team
const lakersPlayers = await db
  .select()
  .from(players)
  .innerJoin(teams, eq(players.teamId, teams.id))
  .where(and(
    eq(teams.abbreviation, 'LAL'),
    eq(players.isActive, true)
  ));

// Get player props for a game
const gameProps = await db
  .select()
  .from(playerProps)
  .innerJoin(players, eq(playerProps.playerId, players.id))
  .innerJoin(propTypes, eq(playerProps.propTypeId, propTypes.id))
  .where(eq(playerProps.gameId, gameId))
  .orderBy(desc(playerProps.hitRate));
```

## 📊 Key Features

### 1. **Normalized Design**
- Eliminates data redundancy
- Ensures data consistency
- Supports complex queries efficiently

### 2. **Comprehensive Analytics**
- Historical performance tracking
- Streak analysis
- Advanced metrics integration

### 3. **Flexible Prop System**
- Supports multiple sports
- Extensible prop types
- Rich analytics per prop

### 4. **User-Centric**
- Subscription management
- Social features
- Betting history tracking

### 5. **Performance Optimized**
- Strategic indexing
- Efficient relationships
- Query optimization ready

## 🔧 Schema Benefits

### For Development
- **Type Safety**: Full TypeScript support with Drizzle
- **Auto-completion**: IDE support for all queries
- **Validation**: Zod schemas for data validation
- **Migrations**: Version-controlled schema changes

### For Analytics
- **Historical Data**: Complete game and player history
- **Trend Analysis**: Built-in streak and performance tracking
- **Flexible Queries**: Support for complex analytics queries
- **Real-time Updates**: Efficient prop and analytics updates

### For Users
- **Social Features**: Posts, comments, and voting
- **Betting History**: Complete tracking of predictions and bets
- **Subscription Tiers**: Flexible access control
- **Performance Tracking**: Personal stats and ROI

## 🎯 Next Steps

1. **Set up Neon Database** connection
2. **Run initial migration** to create tables
3. **Seed database** with sample data
4. **Integrate with existing APIs** for data ingestion
5. **Build analytics queries** for the frontend
6. **Implement real-time updates** for live props

This schema provides a solid foundation for a comprehensive sports analytics and betting platform with room for future expansion and optimization.
