import fetch from "node-fetch";

const BASE = "https://statpedia-player-props.statpedia.workers.dev"; // your Worker dev server
const API_KEY = process.env.SPORTS_ODDS_API_KEY; // if needed for local tests

async function testLeague(league: string, date: string) {
  const url = `${BASE}/api/${league}/player-props?date=${date}&debug=true`;
  const res = await fetch(url, {
    headers: { "x-api-key": API_KEY || "" },
  });
  const data = await res.json();

  console.log(`\n=== ${league} on ${date} ===`);
  console.log("Upstream events:", data.debug?.upstreamEvents);
  console.log("Total player props:", data.debug?.playerPropsTotal);
  console.log("Events count:", data.events?.length);

  // Print a sample player prop if available
  const firstEvent = data.events?.[0];
  if (firstEvent?.player_props?.length) {
    const sample = firstEvent.player_props[0];
    console.log("Sample prop:", {
      player: sample.player_name,
      market: sample.market_type,
      line: sample.line,
      best_over: sample.best_over,
      best_under: sample.best_under,
    });
  } else {
    console.log("No player props found for this league/date.");
    console.log("First event structure:", {
      eventID: firstEvent?.eventID,
      leagueID: firstEvent?.leagueID,
      player_props_count: firstEvent?.player_props?.length,
      team_props_count: firstEvent?.team_props?.length,
    });
  }
}

(async () => {
  const today = new Date().toISOString().slice(0, 10);

  await testLeague("nfl", today);
  await testLeague("nba", today);
  await testLeague("mlb", today);

  // Run twice to confirm cache hit
  console.log("\nRunning again to test cache hit...");
  await testLeague("nfl", today);
})();
