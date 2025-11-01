# Skill Activation Prompt Hook

**Purpose:** Automatically inject relevant skill context at the start of conversations when specific files are open or mentioned.

**When it activates:** Beginning of new conversations, when files matching skill triggers are in focus.

**What it does:** Checks which skills are relevant based on open files and keywords, then surfaces their core principles without overwhelming the initial context.

---

## Hook Logic

```typescript
// Pseudo-code for understanding
function activateSkill(openFiles: string[], keywords: string[]): string[] {
  const relevantSkills: string[] = [];
  
  // Check sports-data-pipeline skill
  if (openFiles.some(f => f.match(/scripts\/(ingest|backfill|enrich)/)) ||
      keywords.some(k => ['ingestion', 'backfill', 'enrichment', 'ESPN'].includes(k))) {
    relevantSkills.push('sports-data-pipeline');
  }
  
  // Check backend-dev-guidelines skill
  if (openFiles.some(f => f.match(/server\/|api\/|\.ts$/)) ||
      keywords.some(k => ['API', 'endpoint', 'Express', 'Neon'].includes(k))) {
    relevantSkills.push('backend-dev-guidelines');
  }
  
  // Check frontend-dev-guidelines skill
  if (openFiles.some(f => f.match(/src\/.*\.(tsx|jsx)$/)) ||
      keywords.some(k => ['component', 'React', 'UI', 'shadcn'].includes(k))) {
    relevantSkills.push('frontend-dev-guidelines');
  }
  
  return relevantSkills;
}
```

---

## Activation Prompt Template

When skills are detected, this prompt is injected:

```markdown
## 🎯 Active Skills

Based on your current context, these domain-specific skills are available:

{for each skill:}
### {skill.name}
**Focus:** {skill.description}
**Patterns available:** {skill.keyPatterns}
**Resources:** {skill.resources}

{end for}

💡 I'll use these patterns to provide context-aware suggestions. Ask me about specific patterns or request "show me [pattern-name]" to see detailed examples.
```

---

## Example Activations

### Scenario 1: Opening `scripts/ingest-official-game-logs.ts`
```markdown
## 🎯 Active Skills

### sports-data-pipeline
**Focus:** ESPN API ingestion, enrichment analytics, backfill coordination
**Patterns available:** 
- ESPN API structure for NFL/NBA/MLB/NHL/WNBA
- Compound stat parsing ("12/18", "5-46")
- Pagination with cursor, rate limiting
- Retry logic with exponential backoff
- Progress tracking and notifications

**Resources:** 
- [Ingestion Patterns](ingestion-patterns.md)
- [Enrichment Patterns](enrichment-patterns.md)
- [Backfill Patterns](backfill-patterns.md)
- [Monitoring Patterns](monitoring-patterns.md)

💡 I'll help you work with ESPN API ingestion patterns. Ask about specific leagues or extraction logic.
```

### Scenario 2: Opening `src/components/PlayerCard.tsx`
```markdown
## 🎯 Active Skills

### frontend-dev-guidelines
**Focus:** React + Vite + shadcn/ui component patterns
**Patterns available:**
- Component composition with shadcn/ui
- TanStack Query for data fetching
- Type-safe prop interfaces
- Accessibility best practices
- Responsive design patterns

**Resources:**
- [Component Patterns](component-patterns.md)
- [Data Fetching](data-fetching.md)
- [Styling Guide](styling-guide.md)

💡 I'll help you build accessible, type-safe React components.
```

### Scenario 3: Opening `server/routes/players.ts`
```markdown
## 🎯 Active Skills

### backend-dev-guidelines
**Focus:** Express + Neon Postgres API patterns
**Patterns available:**
- Express route handlers with TypeScript
- Direct SQL with Drizzle ORM
- Error handling and validation
- Query optimization
- Authentication middleware

**Resources:**
- [API Patterns](api-patterns.md)
- [Database Queries](database-queries.md)
- [Error Handling](error-handling.md)

💡 I'll help you build robust Express APIs with Neon Postgres.
```

---

## Configuration

Skills are registered in `.claude/skills/skill-rules.json`:

```json
{
  "skills": [
    {
      "name": "sports-data-pipeline",
      "skillPath": "sports-data-pipeline/sports-data-pipeline.md",
      "triggers": {
        "fileTriggers": {
          "pathPatterns": ["scripts/ingest*.ts", "scripts/backfill*.ts", "scripts/enrich*.ts"]
        },
        "keywords": ["ingestion", "backfill", "enrichment", "ESPN", "league"]
      }
    }
  ]
}
```

---

## Benefits

1. **Automatic Context** - Relevant patterns surface without manual requests
2. **Progressive Disclosure** - Shows overview first, details on demand
3. **Multi-Skill Support** - Multiple skills can activate simultaneously
4. **Non-Intrusive** - Brief summary doesn't clutter initial context
5. **Discoverability** - Users learn about available patterns organically

---

## Tuning

If skills activate too often:
- Narrow `pathPatterns` to be more specific
- Remove broad keywords
- Add exclusion patterns

If skills don't activate enough:
- Add more path patterns
- Include common synonyms in keywords
- Lower specificity threshold

---

**Related:** [Post Tool Use Tracker](../hooks/post-tool-use-tracker.md), [Skill Rules](../skills/skill-rules.json)
