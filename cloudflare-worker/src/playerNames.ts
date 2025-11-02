// Player name cleaning and normalization for consistent display
// Handles prop type contamination, empty names, and ID-based fallbacks

type RawPropRow = {
  player_id?: string | null;
  player_name?: string | null;
  prop_type?: string | null;
  propType?: string | null;       // camelCase version
  league?: string | null;
  date?: string | null;           // if using logs
  prop_date?: string | null;      // if using proplines view
  sportsbook?: string | null;
  game_id?: string | null;
};

type CleanPropRow = RawPropRow & {
  clean_player_name: string;
  debug: {
    name_source: "player_name" | "derived_from_player_id" | "unknown";
    original_player_name: string | null;
    original_player_id: string | null;
    had_prop_in_name: boolean;
    was_empty_or_null: boolean;
  };
};

/**
 * Normalize a player name:
 * - trims whitespace
 * - removes accidental prop type suffix/prefix
 * - collapses multiple spaces
 * - guards against null/empty
 */
function normalizeName(name: string, propType?: string | null): { value: string; hadPropInName: boolean } {
  const original = name ?? "";
  const trimmed = original.trim();
  const lowerProp = (propType ?? "").trim().toLowerCase();

  // Patterns that accidentally inject prop type
  const patterns: RegExp[] = [];
  if (lowerProp) {
    // e.g., "Tua Tagovailoa Passing Yards", "Passing Yards - Tua Tagovailoa"
    patterns.push(new RegExp(`\\s*-?\\s*${lowerProp.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}\\s*$`, "i"));
    patterns.push(new RegExp(`^${lowerProp.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}\\s*-?\\s*`, "i"));
  }

  let cleaned = trimmed;
  let hadPropInName = false;
  for (const pat of patterns) {
    if (pat.test(cleaned)) {
      hadPropInName = true;
      cleaned = cleaned.replace(pat, "").trim();
    }
  }

  // Collapse double spaces
  cleaned = cleaned.replace(/\s{2,}/g, " ");

  return { value: cleaned, hadPropInName };
}

/**
 * Derive a display name from player_id if needed:
 * - split hyphen/underscore IDs into words
 * - capitalize words
 * - remove common suffixes like "_1_NFL"
 */
function deriveNameFromId(playerId: string | null | undefined): string | null {
  if (!playerId) return null;
  const base = String(playerId).trim();
  if (!base) return null;
  
  // Remove common suffixes like "_1_NFL", "_2_NBA", etc.
  const cleaned = base.replace(/_\d+_[A-Z]+$/, '');
  
  // Split by underscores, hyphens, and dots
  const parts = cleaned.split(/[_\-.]/).filter(Boolean);
  if (parts.length === 0) return null;
  
  // Capitalize each part properly
  return parts
    .map((p) => {
      if (p.length === 0) return p;
      // Handle all caps (like "NFL") vs mixed case
      if (p === p.toUpperCase() && p.length > 2) {
        return p; // Keep acronyms like "NFL", "NBA" as-is
      }
      return p[0].toUpperCase() + p.slice(1).toLowerCase();
    })
    .join(" ");
}

/**
 * Clean player names in a batch of rows with deep debug info.
 * Non-breaking: preserves original fields, adds clean_player_name + debug.
 */
export function cleanPlayerNames(rows: RawPropRow[], logPrefix = "[worker:names]"): CleanPropRow[] {
  const cleaned: CleanPropRow[] = [];

  console.log(`${logPrefix} input_rows=${rows.length}`);

  rows.forEach((row, idx) => {
    const originalName = row.player_name ?? null;
    const originalId = row.player_id ?? null;
    const propType = row.prop_type ?? row.propType ?? null;

    let nameSource: CleanPropRow["debug"]["name_source"] = "unknown";
    let baseName: string | null = null;
    let hadPropInName = false;
    let wasEmptyOrNull = false;

    // Prefer player_name when present, but check if it's just a player ID
    if (originalName && originalName.trim().length > 0) {
      // Check if player_name is actually just a player_id (contains underscores/numbers)
      const isPlayerIdFormat = /^[A-Z_]+_\d+_[A-Z]+$/.test(originalName) || 
                               /^[A-Z_]+_\d+$/.test(originalName) ||
                               /^[A-Z_]+_[A-Z]+$/.test(originalName);
      
      if (isPlayerIdFormat) {
        // Treat as player_id and derive a proper name
        wasEmptyOrNull = true;
        const derived = deriveNameFromId(originalName);
        if (derived) {
          const { value } = normalizeName(derived, propType);
          baseName = value;
          nameSource = "derived_from_player_id";
        } else {
          baseName = "Unknown Player";
          nameSource = "unknown";
        }
      } else {
        // It's a real player name, clean it normally
        const { value, hadPropInName: hadProp } = normalizeName(originalName, propType);
        baseName = value;
        hadPropInName = hadProp;
        nameSource = "player_name";
      }
    } else {
      wasEmptyOrNull = true;
      const derived = deriveNameFromId(originalId);
      if (derived) {
        const { value } = normalizeName(derived, propType);
        baseName = value;
        nameSource = "derived_from_player_id";
      } else {
        baseName = "Unknown Player";
        nameSource = "unknown";
      }
    }

    // Defensive: final sanity check
    const finalName =
      !baseName || baseName.trim().length === 0 || /^[\W_]+$/.test(baseName) ? "Unknown Player" : baseName;

    // Log anomalies for immediate triage
    if (hadPropInName || wasEmptyOrNull || finalName === "Unknown Player") {
      console.warn(
        `${logPrefix} anomaly idx=${idx} league=${row.league ?? "?"} date=${row.prop_date ?? row.date ?? "?"} ` +
        `player_id=${originalId ?? "null"} prop_type="${propType ?? "null"}" ` +
        `hadPropInName=${hadPropInName} wasEmptyOrNull=${wasEmptyOrNull} ` +
        `original_name="${originalName ?? ""}" final="${finalName}"`
      );
    }

    cleaned.push({
      ...row,
      clean_player_name: finalName,
      debug: {
        name_source: nameSource,
        original_player_name: originalName,
        original_player_id: originalId,
        had_prop_in_name: hadPropInName,
        was_empty_or_null: wasEmptyOrNull,
      },
    });
  });

  console.log(`${logPrefix} output_rows=${cleaned.length}`);
  return cleaned;
}

// Export types for use in other modules
export type { RawPropRow, CleanPropRow };
