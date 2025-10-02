/**
 * Test Sports Season Service
 * Check which sports are currently in/off season
 */

// Mock the sports season service logic for testing
const SPORT_SEASONS = {
  NFL: {
    name: 'NFL',
    displayName: 'NFL',
    icon: '🏈',
    regularSeason: {
      start: { month: 9, day: 1 },   // September 1
      end: { month: 1, day: 15 }     // January 15 (next year)
    },
    playoffs: {
      start: { month: 1, day: 16 },  // January 16
      end: { month: 2, day: 15 }     // February 15
    },
    offSeason: {
      start: { month: 2, day: 16 },  // February 16
      end: { month: 8, day: 31 }     // August 31
    }
  },
  NBA: {
    name: 'NBA',
    displayName: 'NBA',
    icon: '🏀',
    regularSeason: {
      start: { month: 10, day: 15 }, // October 15
      end: { month: 4, day: 15 }     // April 15 (next year)
    },
    playoffs: {
      start: { month: 4, day: 16 },  // April 16
      end: { month: 6, day: 30 }     // June 30
    },
    offSeason: {
      start: { month: 7, day: 1 },   // July 1
      end: { month: 10, day: 14 }    // October 14
    }
  },
  MLB: {
    name: 'MLB',
    displayName: 'MLB',
    icon: '⚾',
    regularSeason: {
      start: { month: 3, day: 20 },  // March 20
      end: { month: 10, day: 1 }     // October 1
    },
    playoffs: {
      start: { month: 10, day: 2 },  // October 2
      end: { month: 11, day: 15 }    // November 15
    },
    offSeason: {
      start: { month: 11, day: 16 }, // November 16
      end: { month: 3, day: 19 }     // March 19 (next year)
    }
  },
  NHL: {
    name: 'NHL',
    displayName: 'NHL',
    icon: '🏒',
    regularSeason: {
      start: { month: 10, day: 1 },  // October 1
      end: { month: 4, day: 15 }     // April 15 (next year)
    },
    playoffs: {
      start: { month: 4, day: 16 },  // April 16
      end: { month: 6, day: 30 }     // June 30
    },
    offSeason: {
      start: { month: 7, day: 1 },   // July 1
      end: { month: 9, day: 30 }     // September 30
    }
  },
  NCAAF: {
    name: 'NCAAF',
    displayName: 'College Football',
    icon: '🏈',
    regularSeason: {
      start: { month: 8, day: 25 },  // August 25
      end: { month: 12, day: 15 }    // December 15
    },
    playoffs: {
      start: { month: 12, day: 16 }, // December 16
      end: { month: 1, day: 15 }     // January 15 (next year)
    },
    offSeason: {
      start: { month: 1, day: 16 },  // January 16
      end: { month: 8, day: 24 }     // August 24
    }
  },
  NCAAB: {
    name: 'NCAAB',
    displayName: 'College Basketball',
    icon: '🏀',
    regularSeason: {
      start: { month: 11, day: 1 },  // November 1
      end: { month: 3, day: 15 }     // March 15 (next year)
    },
    playoffs: {
      start: { month: 3, day: 16 },  // March 16 (March Madness)
      end: { month: 4, day: 10 }     // April 10
    },
    offSeason: {
      start: { month: 4, day: 11 },  // April 11
      end: { month: 10, day: 31 }    // October 31
    }
  }
};

function getCurrentDate() {
  const now = new Date();
  return {
    month: now.getMonth() + 1, // JavaScript months are 0-indexed
    day: now.getDate(),
    year: now.getFullYear()
  };
}

function isDateInPeriod(currentDate, period) {
  const { month: currentMonth, day: currentDay } = currentDate;
  const { start, end } = period;

  // Handle seasons that cross year boundaries (e.g., NFL: Sep - Jan)
  if (start.month > end.month) {
    // Season crosses year boundary
    return (
      (currentMonth > start.month || (currentMonth === start.month && currentDay >= start.day)) ||
      (currentMonth < end.month || (currentMonth === end.month && currentDay <= end.day))
    );
  } else {
    // Season within same year
    return (
      (currentMonth > start.month || (currentMonth === start.month && currentDay >= start.day)) &&
      (currentMonth < end.month || (currentMonth === end.month && currentDay <= end.day))
    );
  }
}

function getSportStatus(sport) {
  const seasonInfo = SPORT_SEASONS[sport];
  
  if (!seasonInfo) {
    return 'in-season'; // Default to in-season for unknown sports
  }

  const currentDate = getCurrentDate();

  // Check regular season
  if (isDateInPeriod(currentDate, seasonInfo.regularSeason)) {
    return 'in-season';
  }

  // Check playoffs
  if (isDateInPeriod(currentDate, seasonInfo.playoffs)) {
    return 'playoffs';
  }

  // Otherwise, it's off-season
  return 'off-season';
}

function getDaysUntilSeason(sport) {
  const seasonInfo = SPORT_SEASONS[sport];
  
  if (!seasonInfo) return 0;

  const now = new Date();
  const currentYear = now.getFullYear();
  const { start } = seasonInfo.regularSeason;

  // Create next season start date
  let nextSeasonStart = new Date(currentYear, start.month - 1, start.day);
  
  // If the season start has already passed this year, use next year
  if (nextSeasonStart <= now) {
    nextSeasonStart = new Date(currentYear + 1, start.month - 1, start.day);
  }

  // Calculate days difference
  const timeDiff = nextSeasonStart.getTime() - now.getTime();
  return Math.ceil(timeDiff / (1000 * 3600 * 24));
}

function getMonthName(month) {
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];
  return months[month - 1] || 'Unknown';
}

function testSportsSeasons() {
  console.log('🏆 SPORTS SEASON STATUS TEST');
  console.log('=' .repeat(60));
  
  const currentDate = getCurrentDate();
  console.log(`📅 Current Date: ${getMonthName(currentDate.month)} ${currentDate.day}, ${currentDate.year}`);
  console.log('');

  const allSports = Object.keys(SPORT_SEASONS);
  const results = {
    inSeason: [],
    playoffs: [],
    offSeason: []
  };

  allSports.forEach(sport => {
    const seasonInfo = SPORT_SEASONS[sport];
    const status = getSportStatus(sport);
    const isSelectable = status !== 'off-season';
    
    let statusMessage = '';
    let nextSeasonStart = '';
    let daysUntilSeason = 0;

    switch (status) {
      case 'in-season':
        statusMessage = 'Regular Season';
        results.inSeason.push(sport);
        break;
      case 'playoffs':
        statusMessage = 'Playoffs';
        results.playoffs.push(sport);
        break;
      case 'off-season':
        daysUntilSeason = getDaysUntilSeason(sport);
        const nextStart = seasonInfo.regularSeason.start;
        nextSeasonStart = `${getMonthName(nextStart.month)} ${nextStart.day}`;
        statusMessage = `Off Season • Returns ${nextSeasonStart}`;
        results.offSeason.push(sport);
        break;
    }

    const selectableIcon = isSelectable ? '✅' : '❌';
    const statusIcon = status === 'in-season' ? '🟢' : status === 'playoffs' ? '🟣' : '🟠';
    
    console.log(`${selectableIcon} ${statusIcon} ${seasonInfo.icon} ${seasonInfo.displayName}`);
    console.log(`   Status: ${statusMessage}`);
    console.log(`   Selectable: ${isSelectable ? 'YES' : 'NO'}`);
    if (status === 'off-season') {
      console.log(`   Days until season: ${daysUntilSeason}`);
    }
    console.log('');
  });

  console.log('📊 SUMMARY:');
  console.log(`🟢 In Season: ${results.inSeason.length} sports (${results.inSeason.join(', ')})`);
  console.log(`🟣 Playoffs: ${results.playoffs.length} sports (${results.playoffs.join(', ')})`);
  console.log(`🟠 Off Season: ${results.offSeason.length} sports (${results.offSeason.join(', ')})`);
  console.log('');
  
  console.log('🎯 DROPDOWN BEHAVIOR:');
  console.log(`✅ Selectable: ${results.inSeason.length + results.playoffs.length} sports`);
  console.log(`❌ Non-selectable: ${results.offSeason.length} sports`);
  console.log('');
  
  console.log('💡 EXPECTED UI:');
  console.log('- In-season/playoff sports appear first and are clickable');
  console.log('- Off-season sports appear last with "OFF SEASON" badge');
  console.log('- Off-season sports are grayed out and non-clickable');
  console.log('- Return date shown for off-season sports');

  return results;
}

// Run the test
testSportsSeasons();
