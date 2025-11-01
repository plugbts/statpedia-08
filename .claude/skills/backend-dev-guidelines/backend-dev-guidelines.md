# Backend Dev Guidelines

**Tech Stack:** Express + TypeScript + Neon Postgres + Drizzle ORM

**Purpose:** Best practices for building robust, type-safe API endpoints with direct SQL queries.

---

## Core Principles

1. **Type Safety First** - TypeScript interfaces for all request/response types
2. **Direct SQL with Drizzle** - Not using Prisma; use `drizzle-orm` with `postgres-js`
3. **Explicit Error Handling** - Try-catch around all async operations
4. **Validation** - Zod schemas for request validation
5. **Authentication** - JWT tokens with Bearer scheme
6. **CORS Configuration** - Explicit origin whitelisting

---

## Quick Reference

### Standard Route Structure
```typescript
app.get("/api/resource/:id", async (req, res) => {
  try {
    // 1. Validate input
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({
        success: false,
        error: "ID is required"
      });
    }
    
    // 2. Query database
    const resource = await db.execute(sql`
      SELECT * FROM resources WHERE id = ${id}
    `);
    
    // 3. Handle not found
    if (!resource[0]) {
      return res.status(404).json({
        success: false,
        error: "Resource not found"
      });
    }
    
    // 4. Return success
    res.json({
      success: true,
      data: resource[0]
    });
    
  } catch (error) {
    // 5. Handle errors
    console.error("Error fetching resource:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Internal server error"
    });
  }
});
```

### Auth-Protected Route
```typescript
app.get("/api/protected", async (req, res) => {
  try {
    // Extract and verify token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        error: "Authorization header required"
      });
    }
    
    const token = authHeader.substring(7);
    const { userId, valid } = authService.verifyToken(token);
    
    if (!valid) {
      return res.status(401).json({
        success: false,
        error: "Invalid or expired token"
      });
    }
    
    // Use userId for business logic
    const data = await fetchUserData(userId);
    
    res.json({ success: true, data });
    
  } catch (error) {
    console.error("Auth error:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});
```

### Database Query with Drizzle
```typescript
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { sql, eq } from "drizzle-orm";
import { players, games } from "../db/schema";

const conn = postgres(process.env.NEON_DATABASE_URL);
const db = drizzle(conn, { schema: { players, games } });

// Raw SQL query
const results = await db.execute(sql`
  SELECT p.*, g.game_date
  FROM players p
  JOIN games g ON g.id = p.game_id
  WHERE g.game_date >= ${startDate}
  LIMIT ${limit}
`);

// Query builder
const player = await db.query.players.findFirst({
  where: eq(players.id, playerId),
  with: {
    games: true
  }
});
```

---

## Resources

- [API Patterns](./resources/api-patterns.md) - Route organization, middleware, validation
- [Database Queries](./resources/database-queries.md) - Drizzle ORM patterns, SQL best practices
- [Error Handling](./resources/error-handling.md) - Consistent error responses, logging
- [Authentication](./resources/authentication.md) - JWT patterns, middleware, access control

---

## Common Mistakes

### ❌ Mistake 1: Not Using Try-Catch
```typescript
// BAD: Unhandled error crashes server
app.get("/api/players", async (req, res) => {
  const players = await db.execute(sql`SELECT * FROM players`);
  res.json(players);
});

// GOOD: Errors handled gracefully
app.get("/api/players", async (req, res) => {
  try {
    const players = await db.execute(sql`SELECT * FROM players`);
    res.json({ success: true, data: players });
  } catch (error) {
    console.error("Error fetching players:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});
```

### ❌ Mistake 2: No Input Validation
```typescript
// BAD: Trusting user input
app.post("/api/players", async (req, res) => {
  const { name, position } = req.body;
  await db.insert(players).values({ name, position });
  res.json({ success: true });
});

// GOOD: Validate with Zod
import { z } from "zod";

const playerSchema = z.object({
  name: z.string().min(1),
  position: z.string().min(1)
});

app.post("/api/players", async (req, res) => {
  try {
    const validated = playerSchema.parse(req.body);
    await db.insert(players).values(validated);
    res.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        details: error.errors
      });
    }
    throw error;
  }
});
```

### ❌ Mistake 3: SQL Injection Risk
```typescript
// BAD: String interpolation (SQL injection!)
const userId = req.params.id;
const query = `SELECT * FROM users WHERE id = '${userId}'`;
await db.execute(sql.raw(query));

// GOOD: Parameterized queries
await db.execute(sql`
  SELECT * FROM users WHERE id = ${userId}
`);
```

### ❌ Mistake 4: Missing CORS Configuration
```typescript
// BAD: Wildcard CORS (security risk)
app.use(cors());

// GOOD: Explicit origin whitelisting
app.use(cors({
  origin: [
    "http://localhost:8080",
    "http://localhost:8081",
    "https://your-domain.com"
  ],
  credentials: true
}));
```

### ❌ Mistake 5: Inconsistent Response Format
```typescript
// BAD: Different formats per route
app.get("/api/players", (req, res) => res.json(players));
app.get("/api/games", (req, res) => res.json({ data: games }));
app.get("/api/stats", (req, res) => res.json({ success: true, result: stats }));

// GOOD: Consistent format
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

app.get("/api/players", (req, res) => {
  res.json({ success: true, data: players });
});
app.get("/api/games", (req, res) => {
  res.json({ success: true, data: games });
});
```

---

## Testing Patterns

### Manual API Testing
```typescript
// Create test script: scripts/test-api.ts
import fetch from "node-fetch";

const API = "http://localhost:3001";

async function testAuth() {
  // Signup
  const signup = await fetch(`${API}/api/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "test@example.com",
      password: "password123"
    })
  });
  
  const { data } = await signup.json();
  console.log("Token:", data.token);
  
  // Get user
  const me = await fetch(`${API}/api/auth/me`, {
    headers: { "Authorization": `Bearer ${data.token}` }
  });
  
  console.log("User:", await me.json());
}

testAuth().catch(console.error);
```

---

## Next Steps

See resource files for detailed patterns:
1. **API Patterns** - Route organization, middleware chains
2. **Database Queries** - Advanced Drizzle patterns, transactions
3. **Error Handling** - Centralized error middleware
4. **Authentication** - JWT refresh tokens, role-based access

---

**Related:** [Frontend Dev Guidelines](../frontend-dev-guidelines/frontend-dev-guidelines.md), [Sports Data Pipeline](../sports-data-pipeline/sports-data-pipeline.md)
