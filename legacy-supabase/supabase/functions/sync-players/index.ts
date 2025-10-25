import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export default async function handler(req: Request): Promise<Response> {
  console.log("🔄 Starting players sync function...");

  try {
    // Fetch distinct players from proplines
    const { data: proplinesData, error: proplinesError } = await supabase
      .from("proplines")
      .select("player_id, player_name, team, league")
      .not("player_id", "is", null)
      .not("player_name", "is", null)
      .not("player_name", "eq", "null");

    if (proplinesError) {
      console.error("❌ Error fetching proplines:", proplinesError.message);
      return new Response("Error fetching proplines", { status: 500 });
    }

    // Fetch distinct players from player_game_logs
    const { data: gameLogsData, error: gameLogsError } = await supabase
      .from("player_game_logs")
      .select("player_id, player_name, team, league")
      .not("player_id", "is", null)
      .not("player_name", "is", null)
      .not("player_name", "eq", "null");

    if (gameLogsError) {
      console.error("❌ Error fetching game logs:", gameLogsError.message);
      return new Response("Error fetching game logs", { status: 500 });
    }

    // Combine and deduplicate players
    const allPlayers = [...(proplinesData || []), ...(gameLogsData || [])];
    const uniquePlayers = new Map();

    allPlayers.forEach((player) => {
      if (!uniquePlayers.has(player.player_id)) {
        uniquePlayers.set(player.player_id, player);
      }
    });

    console.log(`📊 Found ${uniquePlayers.size} unique players to sync`);

    // Team abbreviation normalization mapping
    const teamMapping: Record<string, string> = {
      PHILADEL: "PHI",
      NEW: "NYG", // Default to NYG for NEW
      PITTSBUR: "PIT",
      SEATTLE: "SEA",
      DENVER: "DEN",
      CHICAGO: "CHI",
      WASHING: "WAS",
      ATLANTA: "ATL",
      BUFFALO: "BUF",
      CAROLIN: "CAR",
      CINCINN: "CIN",
      CLEVELA: "CLE",
      DALLAS: "DAL",
      DETROIT: "DET",
      GREEN: "GB",
      HOUSTON: "HOU",
      INDIANA: "IND",
      JACKSON: "JAX",
      KANSAS: "KC",
      LAS: "LV",
      LOS: "LAC",
      MIAMI: "MIA",
      MINNESO: "MIN",
      TAMPA: "TB",
      TENNESSE: "TEN",
      UNK: "FA", // Map UNK to Free Agent
    };

    // Sport mapping
    const sportMapping: Record<string, string> = {
      nfl: "football",
      nba: "basketball",
      mlb: "baseball",
      nhl: "hockey",
    };

    // Prepare players for upsert
    const playersToUpsert = Array.from(uniquePlayers.values()).map((player) => {
      // Normalize team abbreviation
      let normalizedTeam = player.team;
      if (normalizedTeam === "UNK" || normalizedTeam === null) {
        normalizedTeam = "FA";
      } else {
        const upperTeam = normalizedTeam.toUpperCase();
        normalizedTeam = teamMapping[upperTeam] || normalizedTeam;
      }

      // Clean player name
      let cleanName = player.player_name;
      if (cleanName) {
        cleanName = cleanName
          .replace(/_\d+_NFL/g, "") // Remove _1_NFL suffixes
          .replace(/_(Sacks|Touchdowns|Interceptions|Assisted Tackles|Turnovers)$/g, "") // Remove prop type suffixes
          .replace(/_/g, " ") // Replace underscores with spaces
          .trim();
      }

      return {
        player_id: player.player_id,
        full_name: cleanName,
        team: normalizedTeam,
        league: player.league?.toUpperCase() || "NFL",
        sport: sportMapping[player.league?.toLowerCase()] || "football",
        position: "UNK", // We don't have position data from these sources
      };
    });

    console.log(`📊 Prepared ${playersToUpsert.length} players for upsert`);

    // Upsert players into players table
    const { data: upsertData, error: upsertError } = await supabase
      .from("players")
      .upsert(playersToUpsert, {
        onConflict: "player_id",
        ignoreDuplicates: false,
      });

    if (upsertError) {
      console.error("❌ Error upserting players:", upsertError.message);
      return new Response(`Error upserting players: ${upsertError.message}`, { status: 500 });
    }

    console.log(`✅ Successfully synced ${playersToUpsert.length} players`);

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully synced ${playersToUpsert.length} players`,
        timestamp: new Date().toISOString(),
        stats: {
          proplinesPlayers: proplinesData?.length || 0,
          gameLogsPlayers: gameLogsData?.length || 0,
          uniquePlayers: uniquePlayers.size,
          upsertedPlayers: playersToUpsert.length,
        },
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
  } catch (error) {
    console.error("❌ Sync function error:", error);
    return new Response(`Sync function error: ${error}`, { status: 500 });
  }
}
