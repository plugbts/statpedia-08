// Unit tests for player name cleaning functionality
import { cleanPlayerNames, type RawPropRow } from "./playerNames";

// Mock console methods to capture logs
const originalConsoleLog = console.log;
const originalConsoleWarn = console.warn;
let consoleLogs: string[] = [];
let consoleWarns: string[] = [];

beforeEach(() => {
  consoleLogs = [];
  consoleWarns = [];
  console.log = (...args) => consoleLogs.push(args.join(' '));
  console.warn = (...args) => consoleWarns.push(args.join(' '));
});

afterEach(() => {
  console.log = originalConsoleLog;
  console.warn = originalConsoleWarn;
});

describe("cleanPlayerNames", () => {
  test("removes prop type suffix from player names", () => {
    const rows: RawPropRow[] = [
      { 
        player_name: "Tua Tagovailoa Passing Yards", 
        prop_type: "Passing Yards",
        player_id: "tua_tagovailoa",
        league: "nfl"
      }
    ];
    
    const result = cleanPlayerNames(rows);
    
    expect(result).toHaveLength(1);
    expect(result[0].clean_player_name).toBe("Tua Tagovailoa");
    expect(result[0].debug.had_prop_in_name).toBe(true);
    expect(result[0].debug.name_source).toBe("player_name");
  });

  test("removes prop type prefix from player names", () => {
    const rows: RawPropRow[] = [
      { 
        player_name: "Passing Yards - Tua Tagovailoa", 
        prop_type: "Passing Yards",
        player_id: "tua_tagovailoa",
        league: "nfl"
      }
    ];
    
    const result = cleanPlayerNames(rows);
    
    expect(result).toHaveLength(1);
    expect(result[0].clean_player_name).toBe("Tua Tagovailoa");
    expect(result[0].debug.had_prop_in_name).toBe(true);
  });

  test("derives name from player_id when player_name is missing", () => {
    const rows: RawPropRow[] = [
      { 
        player_name: null,
        player_id: "aaron_rodgers",
        prop_type: "Passing Yards",
        league: "nfl"
      }
    ];
    
    const result = cleanPlayerNames(rows);
    
    expect(result).toHaveLength(1);
    expect(result[0].clean_player_name).toBe("Aaron Rodgers");
    expect(result[0].debug.name_source).toBe("derived_from_player_id");
    expect(result[0].debug.was_empty_or_null).toBe(true);
  });

  test("derives name from player_id when player_name is empty", () => {
    const rows: RawPropRow[] = [
      { 
        player_name: "",
        player_id: "lebron_james",
        prop_type: "Points",
        league: "nba"
      }
    ];
    
    const result = cleanPlayerNames(rows);
    
    expect(result).toHaveLength(1);
    expect(result[0].clean_player_name).toBe("Lebron James");
    expect(result[0].debug.name_source).toBe("derived_from_player_id");
    expect(result[0].debug.was_empty_or_null).toBe(true);
  });

  test("falls back to 'Unknown Player' when both name and id are missing", () => {
    const rows: RawPropRow[] = [
      { 
        player_name: null,
        player_id: null,
        prop_type: "Points",
        league: "nba"
      }
    ];
    
    const result = cleanPlayerNames(rows);
    
    expect(result).toHaveLength(1);
    expect(result[0].clean_player_name).toBe("Unknown Player");
    expect(result[0].debug.name_source).toBe("unknown");
    expect(result[0].debug.was_empty_or_null).toBe(true);
  });

  test("handles clean player names without contamination", () => {
    const rows: RawPropRow[] = [
      { 
        player_name: "Tom Brady",
        prop_type: "Passing Yards",
        player_id: "tom_brady",
        league: "nfl"
      }
    ];
    
    const result = cleanPlayerNames(rows);
    
    expect(result).toHaveLength(1);
    expect(result[0].clean_player_name).toBe("Tom Brady");
    expect(result[0].debug.had_prop_in_name).toBe(false);
    expect(result[0].debug.name_source).toBe("player_name");
  });

  test("collapses multiple spaces in names", () => {
    const rows: RawPropRow[] = [
      { 
        player_name: "Tom   Brady",
        prop_type: "Passing Yards",
        player_id: "tom_brady",
        league: "nfl"
      }
    ];
    
    const result = cleanPlayerNames(rows);
    
    expect(result).toHaveLength(1);
    expect(result[0].clean_player_name).toBe("Tom Brady");
  });

  test("handles names with special characters in prop types", () => {
    const rows: RawPropRow[] = [
      { 
        player_name: "Josh Allen Passing Yards",
        prop_type: "Passing Yards",
        player_id: "josh_allen",
        league: "nfl"
      }
    ];
    
    const result = cleanPlayerNames(rows);
    
    expect(result).toHaveLength(1);
    expect(result[0].clean_player_name).toBe("Josh Allen");
  });

  test("preserves all original fields", () => {
    const rows: RawPropRow[] = [
      { 
        player_name: "Test Player",
        player_id: "test_player",
        prop_type: "Points",
        league: "nba",
        date: "2025-01-03",
        prop_date: "2025-01-03",
        sportsbook: "DraftKings",
        game_id: "game_123"
      }
    ];
    
    const result = cleanPlayerNames(rows);
    
    expect(result).toHaveLength(1);
    expect(result[0].player_name).toBe("Test Player");
    expect(result[0].player_id).toBe("test_player");
    expect(result[0].prop_type).toBe("Points");
    expect(result[0].league).toBe("nba");
    expect(result[0].date).toBe("2025-01-03");
    expect(result[0].prop_date).toBe("2025-01-03");
    expect(result[0].sportsbook).toBe("DraftKings");
    expect(result[0].game_id).toBe("game_123");
    expect(result[0].clean_player_name).toBe("Test Player");
  });

  test("logs anomalies for debugging", () => {
    const rows: RawPropRow[] = [
      { 
        player_name: "Tua Tagovailoa Passing Yards",
        prop_type: "Passing Yards",
        player_id: "tua_tagovailoa",
        league: "nfl"
      }
    ];
    
    cleanPlayerNames(rows, "[test]");
    
    expect(consoleWarns).toHaveLength(1);
    expect(consoleWarns[0]).toContain("[test] anomaly");
    expect(consoleWarns[0]).toContain("hadPropInName=true");
  });

  test("handles batch processing correctly", () => {
    const rows: RawPropRow[] = [
      { 
        player_name: "Tua Tagovailoa Passing Yards",
        prop_type: "Passing Yards",
        player_id: "tua_tagovailoa",
        league: "nfl"
      },
      { 
        player_name: "Josh Allen",
        prop_type: "Passing Yards",
        player_id: "josh_allen",
        league: "nfl"
      },
      { 
        player_name: null,
        player_id: "aaron_rodgers",
        prop_type: "Passing Yards",
        league: "nfl"
      }
    ];
    
    const result = cleanPlayerNames(rows);
    
    expect(result).toHaveLength(3);
    expect(result[0].clean_player_name).toBe("Tua Tagovailoa");
    expect(result[1].clean_player_name).toBe("Josh Allen");
    expect(result[2].clean_player_name).toBe("Aaron Rodgers");
    
    expect(consoleLogs).toContain("[worker:names] input_rows=3");
    expect(consoleLogs).toContain("[worker:names] output_rows=3");
  });

  test("handles complex player_id formats", () => {
    const rows: RawPropRow[] = [
      { 
        player_name: null,
        player_id: "lebron-james-23",
        prop_type: "Points",
        league: "nba"
      },
      { 
        player_name: null,
        player_id: "stephen.curry.30",
        prop_type: "Points",
        league: "nba"
      }
    ];
    
    const result = cleanPlayerNames(rows);
    
    expect(result).toHaveLength(2);
    expect(result[0].clean_player_name).toBe("Lebron James 23");
    expect(result[1].clean_player_name).toBe("Stephen Curry 30");
  });

  test("handles edge case with only punctuation in name", () => {
    const rows: RawPropRow[] = [
      { 
        player_name: "---",
        prop_type: "Points",
        player_id: "test_player",
        league: "nba"
      }
    ];
    
    const result = cleanPlayerNames(rows);
    
    expect(result).toHaveLength(1);
    expect(result[0].clean_player_name).toBe("Unknown Player");
  });
});

// Export for potential use in other test files
export { cleanPlayerNames };
