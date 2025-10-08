// Name normalization utility for consistent player matching
// This function normalizes player names for mapping lookup

export function normalizeName(name: string): string {
  return name.toLowerCase()
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .replace(/\s+/g, ' ') // Normalize spaces
    .replace(/\s(jr|sr|iii|iv|v)$/i, '') // Remove suffixes
    .trim();
}

// Alternative normalization for more aggressive matching
export function aggressiveNormalizeName(name: string): string {
  return name.toLowerCase()
    .replace(/[^\w]/g, '') // Remove all non-word characters
    .replace(/\s(jr|sr|iii|iv|v)$/i, '') // Remove suffixes
    .trim();
}

// Generate possible name variations for fuzzy matching
export function generateNameVariations(name: string): string[] {
  const normalized = normalizeName(name);
  const variations = [normalized];
  
  // Add aggressive normalization
  variations.push(aggressiveNormalizeName(name));
  
  // Add variations without common prefixes
  const withoutPrefix = normalized.replace(/^(jr|sr|iii|iv|v)\s+/i, '');
  if (withoutPrefix !== normalized) {
    variations.push(withoutPrefix);
  }
  
  // Add first name only
  const firstName = normalized.split(' ')[0];
  if (firstName && firstName.length > 2) {
    variations.push(firstName);
  }
  
  // Add last name only
  const lastName = normalized.split(' ').pop();
  if (lastName && lastName.length > 2 && lastName !== firstName) {
    variations.push(lastName);
  }
  
  return [...new Set(variations)]; // Remove duplicates
}
