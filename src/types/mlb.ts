import { z } from "zod";

/** Single-book odds (American). Pinnacle optional as `pinny`. */
export const PlayerOddsLineSchema = z.object({
  dk: z.number().optional(),
  fd: z.number().optional(),
  pinny: z.number().optional(),
});

export type PlayerOddsLine = z.infer<typeof PlayerOddsLineSchema>;

export const PlayerPropSchema = z.object({
  market: z.string(),
  line: z.number(),
  odds: PlayerOddsLineSchema,
});

export type PlayerProp = z.infer<typeof PlayerPropSchema>;

export const OddsResponseSchema = z.object({
  props: z.array(PlayerPropSchema),
  books: z.array(z.string()),
});

export type OddsResponse = z.infer<typeof OddsResponseSchema>;

export const BatterStatsSchema = z.object({
  date: z.string(),
  hits: z.number().optional(),
  hr: z.number().optional(),
  avg: z.number().optional(),
  ev: z.number().optional(),
  barrel_pct: z.number().optional(),
});

export type BatterStats = z.infer<typeof BatterStatsSchema>;

export const StatcastSchema = z.object({
  exit_velo: z.number(),
  barrel_pct: z.number(),
  hard_hit_pct: z.number(),
});

export type Statcast = z.infer<typeof StatcastSchema>;

export const StatsResponseSchema = z.object({
  l5: z.array(BatterStatsSchema),
  l20: z.array(BatterStatsSchema),
  statcast: StatcastSchema,
});

export type StatsResponse = z.infer<typeof StatsResponseSchema>;

export const MatchupSchema = z.object({
  pitcher_id: z.string().optional(),
  pitcher_name: z.string().optional(),
  pa: z.number().optional(),
  avg: z.number().optional(),
  ops: z.number().optional(),
});

export type Matchup = z.infer<typeof MatchupSchema>;

export const CareerStatsSchema = z.object({
  games: z.number().optional(),
  avg: z.number().optional(),
  ops: z.number().optional(),
});

export type CareerStats = z.infer<typeof CareerStatsSchema>;

export const MatchupsResponseSchema = z.object({
  vs_pitcher: z.array(MatchupSchema),
  career: CareerStatsSchema,
});

export type MatchupsResponse = z.infer<typeof MatchupsResponseSchema>;

export const PlayerSchema = z.object({
  id: z.string(),
  name: z.string(),
  team: z.string().optional(),
  position: z.string().optional(),
});

export type Player = z.infer<typeof PlayerSchema>;

export const SearchResponseSchema = z.object({
  players: z.array(PlayerSchema),
});

export type SearchResponse = z.infer<typeof SearchResponseSchema>;

export const MlbPlayerIdParamSchema = z
  .string()
  .regex(/^\d{1,10}$/, "expected numeric MLB player id")
  .max(12);

export const SearchQuerySchema = z
  .string()
  .min(1)
  .max(80)
  .transform((s) => s.trim());
