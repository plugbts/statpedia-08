/**
 * Team Colors Service - Provides team colors and branding
 * Maps team abbreviations to their official colors
 */

interface TeamColors {
  primary: string;
  secondary: string;
  accent: string;
  text: string;
  gradient: string;
  border: string;
}

class TeamColorsService {
  // NFL Team Colors
  private readonly NFL_COLORS: Record<string, TeamColors> = {
    'ARI': { primary: '#97233F', secondary: '#000000', accent: '#FFB612', text: '#FFFFFF', gradient: 'from-red-800 to-black', border: 'border-red-800' },
    'ATL': { primary: '#A71930', secondary: '#000000', accent: '#A5ACAF', text: '#FFFFFF', gradient: 'from-red-700 to-black', border: 'border-red-700' },
    'BAL': { primary: '#241773', secondary: '#000000', accent: '#9E7C0C', text: '#FFFFFF', gradient: 'from-purple-900 to-black', border: 'border-purple-900' },
    'BUF': { primary: '#00338D', secondary: '#C60C30', accent: '#FFFFFF', text: '#FFFFFF', gradient: 'from-blue-900 to-red-700', border: 'border-blue-900' },
    'CAR': { primary: '#0085CA', secondary: '#101820', accent: '#BFC0BF', text: '#FFFFFF', gradient: 'from-blue-600 to-gray-900', border: 'border-blue-600' },
    'CHI': { primary: '#0B162A', secondary: '#C83803', accent: '#FFFFFF', text: '#FFFFFF', gradient: 'from-gray-900 to-orange-600', border: 'border-gray-900' },
    'CIN': { primary: '#FB4F14', secondary: '#000000', accent: '#FFFFFF', text: '#FFFFFF', gradient: 'from-orange-600 to-black', border: 'border-orange-600' },
    'CLE': { primary: '#311D00', secondary: '#FF3C00', accent: '#FFFFFF', text: '#FFFFFF', gradient: 'from-amber-900 to-orange-600', border: 'border-amber-900' },
    'DAL': { primary: '#003594', secondary: '#041E42', accent: '#869397', text: '#FFFFFF', gradient: 'from-blue-800 to-blue-900', border: 'border-blue-800' },
    'DEN': { primary: '#FB4F14', secondary: '#002244', accent: '#FFFFFF', text: '#FFFFFF', gradient: 'from-orange-600 to-blue-900', border: 'border-orange-600' },
    'DET': { primary: '#0076B6', secondary: '#B0B7BC', accent: '#FFFFFF', text: '#FFFFFF', gradient: 'from-blue-600 to-gray-400', border: 'border-blue-600' },
    'GB': { primary: '#203731', secondary: '#FFB612', accent: '#FFFFFF', text: '#FFFFFF', gradient: 'from-green-900 to-yellow-500', border: 'border-green-900' },
    'HOU': { primary: '#03202F', secondary: '#A71930', accent: '#FFFFFF', text: '#FFFFFF', gradient: 'from-blue-900 to-red-700', border: 'border-blue-900' },
    'IND': { primary: '#002C5F', secondary: '#A2AAAD', accent: '#FFFFFF', text: '#FFFFFF', gradient: 'from-blue-900 to-gray-400', border: 'border-blue-900' },
    'JAX': { primary: '#006778', secondary: '#9F792C', accent: '#FFFFFF', text: '#FFFFFF', gradient: 'from-teal-700 to-yellow-700', border: 'border-teal-700' },
    'KC': { primary: '#E31837', secondary: '#FFB81C', accent: '#FFFFFF', text: '#FFFFFF', gradient: 'from-red-600 to-yellow-500', border: 'border-red-600' },
    'LV': { primary: '#000000', secondary: '#A5ACAF', accent: '#FFFFFF', text: '#FFFFFF', gradient: 'from-black to-gray-400', border: 'border-black' },
    'LAC': { primary: '#0080C6', secondary: '#FFC20E', accent: '#FFFFFF', text: '#FFFFFF', gradient: 'from-blue-600 to-yellow-500', border: 'border-blue-600' },
    'LAR': { primary: '#003594', secondary: '#FFA300', accent: '#FFFFFF', text: '#FFFFFF', gradient: 'from-blue-800 to-orange-500', border: 'border-blue-800' },
    'MIA': { primary: '#008E97', secondary: '#FC4C02', accent: '#FFFFFF', text: '#FFFFFF', gradient: 'from-teal-600 to-orange-600', border: 'border-teal-600' },
    'MIN': { primary: '#4F2683', secondary: '#FFC62F', accent: '#FFFFFF', text: '#FFFFFF', gradient: 'from-purple-700 to-yellow-400', border: 'border-purple-700' },
    'NE': { primary: '#002244', secondary: '#C60C30', accent: '#FFFFFF', text: '#FFFFFF', gradient: 'from-blue-900 to-red-700', border: 'border-blue-900' },
    'NO': { primary: '#D3BC8D', secondary: '#101820', accent: '#FFFFFF', text: '#000000', gradient: 'from-yellow-300 to-gray-900', border: 'border-yellow-300' },
    'NYG': { primary: '#0B2265', secondary: '#A71930', accent: '#FFFFFF', text: '#FFFFFF', gradient: 'from-blue-800 to-red-700', border: 'border-blue-800' },
    'NYJ': { primary: '#125740', secondary: '#000000', accent: '#FFFFFF', text: '#FFFFFF', gradient: 'from-green-800 to-black', border: 'border-green-800' },
    'PHI': { primary: '#004C54', secondary: '#A5ACAF', accent: '#FFFFFF', text: '#FFFFFF', gradient: 'from-green-800 to-gray-400', border: 'border-green-800' },
    'PIT': { primary: '#FFB612', secondary: '#000000', accent: '#FFFFFF', text: '#000000', gradient: 'from-yellow-500 to-black', border: 'border-yellow-500' },
    'SF': { primary: '#AA0000', secondary: '#B3995D', accent: '#FFFFFF', text: '#FFFFFF', gradient: 'from-red-700 to-yellow-600', border: 'border-red-700' },
    'SEA': { primary: '#002244', secondary: '#69BE28', accent: '#FFFFFF', text: '#FFFFFF', gradient: 'from-blue-900 to-green-600', border: 'border-blue-900' },
    'TB': { primary: '#D50A0A', secondary: '#FF7900', accent: '#FFFFFF', text: '#FFFFFF', gradient: 'from-red-700 to-orange-600', border: 'border-red-700' },
    'TEN': { primary: '#0C2340', secondary: '#4B92DB', accent: '#FFFFFF', text: '#FFFFFF', gradient: 'from-blue-900 to-blue-500', border: 'border-blue-900' },
    'WAS': { primary: '#5A1414', secondary: '#FFB612', accent: '#FFFFFF', text: '#FFFFFF', gradient: 'from-red-800 to-yellow-500', border: 'border-red-800' }
  };

  // NBA Team Colors
  private readonly NBA_COLORS: Record<string, TeamColors> = {
    'ATL': { primary: '#C1D32F', secondary: '#E03A3E', accent: '#FFFFFF', text: '#000000', gradient: 'from-green-400 to-red-600', border: 'border-green-400' },
    'BOS': { primary: '#007A33', secondary: '#BA9653', accent: '#FFFFFF', text: '#FFFFFF', gradient: 'from-green-700 to-yellow-600', border: 'border-green-700' },
    'BKN': { primary: '#000000', secondary: '#FFFFFF', accent: '#FFFFFF', text: '#FFFFFF', gradient: 'from-black to-white', border: 'border-black' },
    'CHA': { primary: '#1D1160', secondary: '#00788C', accent: '#FFFFFF', text: '#FFFFFF', gradient: 'from-blue-900 to-cyan-600', border: 'border-blue-900' },
    'CHI': { primary: '#CE1141', secondary: '#000000', accent: '#FFFFFF', text: '#FFFFFF', gradient: 'from-red-600 to-black', border: 'border-red-600' },
    'CLE': { primary: '#860038', secondary: '#FDBB30', accent: '#FFFFFF', text: '#FFFFFF', gradient: 'from-red-900 to-yellow-400', border: 'border-red-900' },
    'DAL': { primary: '#00538C', secondary: '#002B5E', accent: '#FFFFFF', text: '#FFFFFF', gradient: 'from-blue-700 to-blue-900', border: 'border-blue-700' },
    'DEN': { primary: '#0E2240', secondary: '#FEC524', accent: '#FFFFFF', text: '#FFFFFF', gradient: 'from-blue-900 to-yellow-400', border: 'border-blue-900' },
    'DET': { primary: '#C8102E', secondary: '#1D42BA', accent: '#FFFFFF', text: '#FFFFFF', gradient: 'from-red-600 to-blue-700', border: 'border-red-600' },
    'GSW': { primary: '#1D428A', secondary: '#FFC72C', accent: '#FFFFFF', text: '#FFFFFF', gradient: 'from-blue-700 to-yellow-400', border: 'border-blue-700' },
    'HOU': { primary: '#CE1141', secondary: '#000000', accent: '#FFFFFF', text: '#FFFFFF', gradient: 'from-red-600 to-black', border: 'border-red-600' },
    'IND': { primary: '#002D62', secondary: '#FDBB30', accent: '#FFFFFF', text: '#FFFFFF', gradient: 'from-blue-900 to-yellow-400', border: 'border-blue-900' },
    'LAC': { primary: '#C8102E', secondary: '#1D428A', accent: '#FFFFFF', text: '#FFFFFF', gradient: 'from-red-600 to-blue-700', border: 'border-red-600' },
    'LAL': { primary: '#552583', secondary: '#FDB927', accent: '#FFFFFF', text: '#FFFFFF', gradient: 'from-purple-700 to-yellow-400', border: 'border-purple-700' },
    'MEM': { primary: '#5D76A9', secondary: '#12173F', accent: '#FFFFFF', text: '#FFFFFF', gradient: 'from-blue-500 to-blue-900', border: 'border-blue-500' },
    'MIA': { primary: '#98002E', secondary: '#F9A01B', accent: '#FFFFFF', text: '#FFFFFF', gradient: 'from-red-800 to-orange-500', border: 'border-red-800' },
    'MIL': { primary: '#00471B', secondary: '#EEE1C6', accent: '#FFFFFF', text: '#FFFFFF', gradient: 'from-green-800 to-yellow-100', border: 'border-green-800' },
    'MIN': { primary: '#0C2340', secondary: '#236192', accent: '#FFFFFF', text: '#FFFFFF', gradient: 'from-blue-900 to-blue-600', border: 'border-blue-900' },
    'NOP': { primary: '#0C2340', secondary: '#C8102E', accent: '#FFFFFF', text: '#FFFFFF', gradient: 'from-blue-900 to-red-600', border: 'border-blue-900' },
    'NYK': { primary: '#006BB6', secondary: '#F58426', accent: '#FFFFFF', text: '#FFFFFF', gradient: 'from-blue-600 to-orange-500', border: 'border-blue-600' },
    'OKC': { primary: '#007AC1', secondary: '#EF3B24', accent: '#FFFFFF', text: '#FFFFFF', gradient: 'from-blue-600 to-red-600', border: 'border-blue-600' },
    'ORL': { primary: '#0077C0', secondary: '#C4CED4', accent: '#FFFFFF', text: '#FFFFFF', gradient: 'from-blue-600 to-gray-300', border: 'border-blue-600' },
    'PHI': { primary: '#006BB6', secondary: '#ED174C', accent: '#FFFFFF', text: '#FFFFFF', gradient: 'from-blue-600 to-red-600', border: 'border-blue-600' },
    'PHX': { primary: '#1D1160', secondary: '#E56020', accent: '#FFFFFF', text: '#FFFFFF', gradient: 'from-blue-900 to-orange-600', border: 'border-blue-900' },
    'POR': { primary: '#E03A3E', secondary: '#000000', accent: '#FFFFFF', text: '#FFFFFF', gradient: 'from-red-600 to-black', border: 'border-red-600' },
    'SAC': { primary: '#5A2D81', secondary: '#63727A', accent: '#FFFFFF', text: '#FFFFFF', gradient: 'from-purple-700 to-gray-500', border: 'border-purple-700' },
    'SAS': { primary: '#C4CED4', secondary: '#000000', accent: '#FFFFFF', text: '#000000', gradient: 'from-gray-300 to-black', border: 'border-gray-300' },
    'TOR': { primary: '#CE1141', secondary: '#000000', accent: '#FFFFFF', text: '#FFFFFF', gradient: 'from-red-600 to-black', border: 'border-red-600' },
    'UTA': { primary: '#002B5C', secondary: '#F9A01B', accent: '#FFFFFF', text: '#FFFFFF', gradient: 'from-blue-900 to-orange-500', border: 'border-blue-900' },
    'WAS': { primary: '#002B5C', secondary: '#E31837', accent: '#FFFFFF', text: '#FFFFFF', gradient: 'from-blue-900 to-red-600', border: 'border-blue-900' }
  };

  /**
   * Get team colors by abbreviation and sport
   */
  getTeamColors(teamAbbr: string, sport: string): TeamColors {
    const normalizedAbbr = teamAbbr.toUpperCase();
    const normalizedSport = sport.toLowerCase();
    
    let colors: TeamColors | undefined;
    
    if (normalizedSport === 'nfl' || normalizedSport === 'football') {
      colors = this.NFL_COLORS[normalizedAbbr];
    } else if (normalizedSport === 'nba' || normalizedSport === 'basketball') {
      colors = this.NBA_COLORS[normalizedAbbr];
    }
    
    // Default fallback colors
    if (!colors) {
      return {
        primary: '#64748B',
        secondary: '#1E293B',
        accent: '#FFFFFF',
        text: '#FFFFFF',
        gradient: 'from-slate-600 to-slate-800',
        border: 'border-slate-600'
      };
    }
    
    return colors;
  }

  /**
   * Get team abbreviation for display (with proper formatting)
   */
  getTeamAbbr(teamAbbr: string): string {
    return teamAbbr.toUpperCase();
  }

  /**
   * Get gradient classes for team colors
   */
  getTeamGradient(teamAbbr: string, sport: string): string {
    const colors = this.getTeamColors(teamAbbr, sport);
    return `bg-gradient-to-br ${colors.gradient}`;
  }

  /**
   * Get border classes for team colors
   */
  getTeamBorder(teamAbbr: string, sport: string): string {
    const colors = this.getTeamColors(teamAbbr, sport);
    return `${colors.border}`;
  }
}

// Export singleton instance
export const teamColorsService = new TeamColorsService();
export type { TeamColors };
