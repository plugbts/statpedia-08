// Simple formatting helpers for prop names and odds

export const formatPropName = (prop: string) => {
  if (!prop) return "-";
  const key = prop.toLowerCase().replace(/\s+/g, "_");
  switch (key) {
    case "batting_bases_total":
    case "total_bases":
      return "Batting Bases (O/U)";
    case "strikeouts":
    case "pitching_strikeouts":
      return "Strikeouts (O/U)";
    default:
      return prop.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }
};

// Decimal -> American odds, return '-' when invalid
export const toAmericanOdds = (decimal: number) => {
  if (!decimal || !Number.isFinite(decimal) || decimal <= 1) return "-";
  if (decimal >= 2) return `+${Math.round((decimal - 1) * 100)}`;
  return `${Math.round(-100 / (decimal - 1))}`;
};
