// ingestionFilter.ts
import { SupportedProps } from "./supportedProps";
import { normalizePropType } from "./propTypeSync";

export function filterPropsByLeague(
  props: any[],
  supportedProps: SupportedProps
): any[] {
  const originalCount = props.length;
  const filtered = props.filter((p) => {
    const league = p.league?.toLowerCase();
    const propType = p.prop_type;
    
    if (!league || !propType) {
      console.log(`⚠️ Skipping prop with missing league or prop_type:`, { league, prop_type: propType });
      return false;
    }
    
    const normalized = normalizePropType(propType);
    const isSupported = supportedProps[league]?.has(normalized.toLowerCase());
    
    if (!isSupported) {
      console.log(`⚠️ Dropping unsupported prop: ${league.toUpperCase()} ${propType} → ${normalized}`);
    }
    
    return isSupported;
  });
  
  const filteredCount = filtered.length;
  const droppedCount = originalCount - filteredCount;
  
  if (droppedCount > 0) {
    console.log(`📊 Props filtered: ${originalCount} → ${filteredCount} (dropped ${droppedCount} unsupported)`);
  }
  
  return filtered;
}

export function filterGameLogsByLeague(
  gameLogs: any[],
  supportedProps: SupportedProps
): any[] {
  const originalCount = gameLogs.length;
  const filtered = gameLogs.filter((g) => {
    const league = g.league?.toLowerCase();
    const propType = g.prop_type;
    
    if (!league || !propType) {
      return false;
    }
    
    const normalized = normalizePropType(propType);
    const isSupported = supportedProps[league]?.has(normalized.toLowerCase());
    
    return isSupported;
  });
  
  const filteredCount = filtered.length;
  const droppedCount = originalCount - filteredCount;
  
  if (droppedCount > 0) {
    console.log(`📊 Game logs filtered: ${originalCount} → ${filteredCount} (dropped ${droppedCount} unsupported)`);
  }
  
  return filtered;
}

export function getSupportedPropsSummary(supportedProps: SupportedProps): Record<string, string[]> {
  const summary: Record<string, string[]> = {};
  
  Object.entries(supportedProps).forEach(([league, props]) => {
    summary[league] = Array.from(props).sort();
  });
  
  return summary;
}
