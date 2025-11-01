# Post Tool Use Tracker Hook

**Purpose:** Monitor tool usage patterns and suggest optimizations to improve efficiency and code quality.

**When it activates:** After every tool invocation (read_file, replace_string_in_file, run_in_terminal, etc.)

**What it does:** Tracks patterns, detects inefficiencies, and surfaces best practices at appropriate moments.

---

## Tracking Patterns

### Pattern 1: Repeated Small Reads
**Anti-pattern:** Multiple small `read_file` calls to the same file
```
❌ read_file(file.ts, 1-20)
❌ read_file(file.ts, 21-40)
❌ read_file(file.ts, 41-60)
```

**Optimization:**
```
✅ read_file(file.ts, 1-100)  // Read larger chunks
```

**Trigger:** 3+ reads of same file within 5 tool calls  
**Message:** *"💡 Tip: Consider reading larger sections (50-100 lines) instead of multiple small reads to reduce tool calls."*

---

### Pattern 2: Edit Without Context
**Anti-pattern:** Editing a file without reading it first
```
❌ replace_string_in_file(file.ts, oldString, newString)
```

**Optimization:**
```
✅ read_file(file.ts, 1-50)  // Get context first
✅ replace_string_in_file(file.ts, oldString, newString)
```

**Trigger:** Edit to file that hasn't been read in current conversation  
**Message:** *"⚠️ Warning: Editing without reading context first may cause merge conflicts. Consider reading the surrounding code."*

---

### Pattern 3: Grep Before Semantic Search
**Anti-pattern:** Using grep_search when semantic_search would be better
```
❌ grep_search("function|method|def", isRegexp=true)
```

**Optimization:**
```
✅ semantic_search("functions and methods that handle user authentication")
```

**Trigger:** Grep with broad alternation (3+ terms) or complex regex  
**Message:** *"💡 Tip: semantic_search may work better for concept-based queries. Use grep_search for exact strings."*

---

### Pattern 4: Terminal Command Batching
**Anti-pattern:** Multiple related terminal commands separately
```
❌ run_in_terminal("cd api")
❌ run_in_terminal("npm install")
❌ run_in_terminal("npm run build")
```

**Optimization:**
```
✅ run_in_terminal("cd api && npm install && npm run build")
```

**Trigger:** 2+ sequential terminal commands to same directory  
**Message:** *"💡 Tip: Combine related terminal commands with && to reduce tool calls and maintain context."*

---

### Pattern 5: File Creation in Existing Directory
**Anti-pattern:** Using create_directory when directory exists
```
❌ create_directory("/path/to/existing")
❌ create_file("/path/to/existing/file.ts")
```

**Optimization:**
```
✅ create_file("/path/to/existing/file.ts")  // Auto-creates dirs if needed
```

**Trigger:** create_directory followed immediately by create_file in same path  
**Message:** *"💡 Tip: create_file automatically creates parent directories. No need to call create_directory first."*

---

## Tool Usage Statistics

The hook tracks these metrics:
```typescript
interface ToolStats {
  totalCalls: number;
  byTool: Record<string, number>;
  fileReads: {
    path: string;
    ranges: Array<[number, number]>;
    count: number;
  }[];
  editedWithoutContext: string[];
  terminalCommands: {
    command: string;
    cwd: string;
    timestamp: number;
  }[];
}
```

---

## Periodic Summaries

Every 20 tool calls, show a brief efficiency report:

```markdown
## 📊 Tool Usage Summary (Last 20 calls)

**Efficiency Score:** 85/100

**Breakdown:**
- ✅ read_file: 6 calls (optimal range sizes)
- ✅ replace_string_in_file: 4 calls (all with context)
- ⚠️ grep_search: 3 calls (2 could use semantic_search)
- ✅ run_in_terminal: 2 calls (well-batched)
- ✅ create_file: 5 calls

**Suggestions:**
1. Consider semantic_search for concept-based queries
2. Great job reading context before edits! 🎉
```

---

## Project-Specific Patterns

### Sports Data Pipeline Scripts
When working in `scripts/`:

**Pattern:** Always check for existing data before backfilling
```typescript
// ✅ Good: Check first
const existing = await db.execute(sql`
  SELECT COUNT(*) FROM player_game_logs 
  WHERE game_date = ${date}
`);
if (existing[0].count > 0) {
  console.log('Data already exists, skipping...');
  return;
}
```

**Trigger:** Creating backfill script without verification query  
**Message:** *"💡 Sports Pipeline Tip: Add data existence checks before backfilling to avoid duplicates. See [Backfill Patterns](backfill-patterns.md#verification)."*

---

### React Components
When working in `src/components/`:

**Pattern:** Always include TypeScript interfaces for props
```typescript
// ✅ Good: Typed props
interface PlayerCardProps {
  playerId: string;
  onSelect?: (id: string) => void;
}

export function PlayerCard({ playerId, onSelect }: PlayerCardProps) {
  // ...
}
```

**Trigger:** Creating component without interface definition  
**Message:** *"💡 Frontend Tip: Define TypeScript interfaces for component props. See [Component Patterns](component-patterns.md#props)."*

---

### API Routes
When working in `server/routes/`:

**Pattern:** Always include error handling
```typescript
// ✅ Good: Error handling
app.get('/api/players/:id', async (req, res) => {
  try {
    const player = await db.query.players.findFirst({
      where: eq(players.id, req.params.id)
    });
    
    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }
    
    res.json(player);
  } catch (error) {
    console.error('Error fetching player:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

**Trigger:** Creating route handler without try-catch  
**Message:** *"💡 Backend Tip: Wrap async route handlers in try-catch. See [Error Handling](error-handling.md#routes)."*

---

## Configuration

Enable/disable tracking in `.claude/hooks/hook-config.json`:

```json
{
  "post-tool-use-tracker": {
    "enabled": true,
    "suggestionThresholds": {
      "repeatedReads": 3,
      "editWithoutContext": true,
      "terminalBatching": 2,
      "summaryInterval": 20
    },
    "projectPatterns": {
      "sports-data-pipeline": true,
      "frontend-components": true,
      "backend-routes": true
    }
  }
}
```

---

## Benefits

1. **Learn Best Practices** - Discover better tool usage patterns organically
2. **Reduce Tool Calls** - Suggestions help optimize workflow efficiency
3. **Project-Aware** - Context-specific tips based on current work
4. **Non-Intrusive** - Tips appear only when relevant, not every call
5. **Measurable Progress** - Track improvement with efficiency scores

---

## Example Session Flow

**Step 1:** User asks to update ingestion script  
→ Agent reads `scripts/ingest-official-game-logs.ts` (1-50)  
→ Hook: ✅ Good context gathering

**Step 2:** Agent makes edit to add pagination  
→ Agent uses `replace_string_in_file` with 5 lines context  
→ Hook: ✅ Edit includes proper context

**Step 3:** Agent reads file again (51-100)  
→ Hook tracks: 2 reads of same file  
→ No message yet (threshold is 3)

**Step 4:** Agent reads file third time (101-150)  
→ Hook: *"💡 Tip: Consider reading larger sections to reduce tool calls"*

**Step 5:** After 20 tool calls total  
→ Hook shows efficiency summary with score and suggestions

---

## Advanced: Pattern Learning

The hook can learn project-specific patterns over time:

```typescript
interface LearnedPattern {
  name: string;
  trigger: (context: Context) => boolean;
  suggestion: string;
  confidence: number; // 0-1 based on successful applications
}

// Example learned pattern
{
  name: "espn-api-retry-logic",
  trigger: (ctx) => ctx.file.includes('ingest') && ctx.codeContains('fetch('),
  suggestion: "Consider adding retry logic with exponential backoff for ESPN API calls",
  confidence: 0.92 // High confidence from repeated successful uses
}
```

---

**Related:** [Skill Activation Prompt](./skill-activation-prompt.md), [Skill Rules](../skills/skill-rules.json)
