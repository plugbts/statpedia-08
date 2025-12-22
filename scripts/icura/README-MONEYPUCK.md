# MoneyPuck Data Ingestion

## Manual Download Required

MoneyPuck doesn't provide a stable public API for automated downloads. You need to manually download the **Shots** CSV:

1. **Visit**: https://moneypuck.com/data.htm
2. **Look for**: "Download Shot Data" or "Shots" section (may be below Skaters/Goalies/Lines/Teams sections)
3. **Download**: The shot data CSV files for:
   - **2023-2024 season** → Save as `moneypuck_shots_2023.csv`
   - **2024-2025 season** → Save as `moneypuck_shots_2024.csv`

**Important**: You need the **Shots** dataset (individual shot events), NOT:
- ❌ Skaters (aggregated player stats)
- ❌ Goalies (aggregated goalie stats)  
- ❌ Lines (line combination stats)
- ❌ Teams (team-level stats)

The Shots file contains each individual shot event with xG, coordinates, rush/high-danger flags, etc.

## Ingestion

Once you have the CSV file:

```bash
# For 2024-2025 season
tsx scripts/icura/ingest-moneypuck-shots.ts --file moneypuck_shots_2024.csv --season 2024-2025

# For 2023-2024 season  
tsx scripts/icura/ingest-moneypuck-shots.ts --file moneypuck_shots_2023.csv --season 2023-2024
```

## Storage Considerations

- **Recent seasons only**: Only ingest 2023-2024 and 2024-2025 to stay within budget
- **Monitor storage**: Run `tsx scripts/check-storage.ts` after ingestion
- **Expected size**: ~50-100 MB per season of shots data

## Alternative: Use URL (if available)

If MoneyPuck provides a direct download URL, you can use:

```bash
tsx scripts/icura/ingest-moneypuck-shots.ts --url "https://moneypuck.com/path/to/shots.csv" --season 2024-2025
```

