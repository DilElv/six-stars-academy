// Field players and goalkeepers are graded on different criteria per
// "Form Rapor FUTURE CHAMPION" vs "Form Rapor GK SEPAKTEMU" — Teknik/Skill
// and Taktik-Defending are entirely GK-specific, Taktik-Attacking is a
// subset (GK adds "Position", drops 3 field-player-only items), and
// Fisik/Mental are identical between both. Category `key`s intentionally
// differ between the two Teknik/Taktik sets (e.g. 'teknik' vs 'teknikGk')
// so a GK's category selection never accidentally matches a field player's,
// but they share the same `avgKey` (teknikAvg/attackingAvg/defendingAvg)
// since the Assessment model has one position-agnostic set of avg columns.
export const FIELD_PLAYER_CATEGORIES = [
  {
    key: 'teknik',
    title: 'I. Teknik / Skill',
    avgKey: 'teknikAvg',
    fields: [
      ['passing', 'Passing'],
      ['control', 'Control'],
      ['runningWithBall', 'Running With The Ball'],
      ['dribbling', 'Dribbling'],
      ['shooting', 'Shooting'],
      ['longPassing', 'Long Passing'],
      ['oneVsOneAttacking', '1 vs 1 Attacking'],
      ['oneVsOneDefending', '1 vs 1 Defending'],
    ],
  },
  {
    key: 'attacking',
    title: 'II.A Taktik — Attacking (Menyerang)',
    avgKey: 'attackingAvg',
    fields: [
      ['attackingPrinciples', 'Attacking Principles'],
      ['possession', 'Possession'],
      ['transitionAttacking', 'Transition (+)'],
      ['combinationPlay', 'Combination Play'],
      ['switchingPlay', 'Switching Play'],
      ['playingOutFromBack', 'Playing Out From The Back'],
      ['finishingFinalThird', 'Finishing in the Final Third'],
    ],
  },
  {
    key: 'defending',
    title: 'II.B Taktik — Defending (Bertahan)',
    avgKey: 'defendingAvg',
    fields: [
      ['defendingPrinciples', 'Defending Principles'],
      ['zonalDefending', 'Zonal Defending'],
      ['retreatRecovery', 'Retreat & Recovery'],
      ['compactness', 'Compactness'],
      ['transitionDefending', 'Transition (-)'],
    ],
  },
  {
    key: 'fisik',
    title: 'III. Fisik',
    avgKey: 'fisikAvg',
    fields: [
      ['maximalStrength', 'Maximal Strength'],
      ['aerobicCapacity', 'Aerobic Capacity'],
      ['reaction', 'Reaction'],
      ['acceleration', 'Acceleration'],
      ['maximalSpeed', 'Maximal Speed'],
      ['speedEndurance', 'Speed Endurance'],
      ['awareness', 'Awareness'],
      ['power', 'Power'],
    ],
  },
  {
    key: 'mental',
    title: 'IV. Mental',
    avgKey: 'mentalAvg',
    fields: [
      ['selfConfidence', 'Self Confidence'],
      ['decision', 'Decision'],
      ['leadership', 'Leadership'],
      ['enthusiasm', 'Enthusiasm'],
      ['communication', 'Communication'],
      ['discipline', 'Discipline'],
    ],
  },
]

export const GK_CATEGORIES = [
  {
    key: 'teknikGk',
    title: 'I. Teknik / Skill (Kiper)',
    avgKey: 'teknikAvg',
    fields: [
      ['gkCatching', 'Catching the Ball'],
      ['gkKicking', 'Kicking the Ball'],
      ['gkThrowing', 'Throwing the Ball'],
      ['gkVolleying', 'Volleying'],
      ['gkDropKick', 'Drop Kick'],
      ['gkGoalKick', 'Goal Kick'],
      ['gkFootwork', 'Footwork'],
      ['gkOneVsOneTeknik', '1 vs 1 Situation'],
    ],
  },
  {
    key: 'attackingGk',
    title: 'II.A Taktik — Attacking (Kiper)',
    avgKey: 'attackingAvg',
    fields: [
      ['gkPositionAttacking', 'Position'],
      ['attackingPrinciples', 'Attacking Principles'],
      ['possession', 'Possession'],
      ['transitionAttacking', 'Transition (+)'],
      ['switchingPlay', 'Switching Play'],
    ],
  },
  {
    key: 'defendingGk',
    title: 'II.B Taktik — Defending (Kiper)',
    avgKey: 'defendingAvg',
    fields: [
      ['gkPositionDefending', 'Position'],
      ['gkDealCrossing', 'Deal with Crossing'],
      ['gkDealCornerKick', 'Deal with Corner Kick'],
      ['gkDealFreeKick', 'Deal with Free Kick'],
      ['gkDealLongPass', 'Deal with Long Pass'],
      ['gkOneVsOneTaktik', '1 vs 1 Situation'],
    ],
  },
  FIELD_PLAYER_CATEGORIES[3], // Fisik — identical for GK
  FIELD_PLAYER_CATEGORIES[4], // Mental — identical for GK
]

export function getCategoriesForPosition(position) {
  return position === 'GK' ? GK_CATEGORIES : FIELD_PLAYER_CATEGORIES
}

export function scoreCategory(value) {
  if (value >= 8) return { label: 'Baik', color: '10b981' }
  if (value >= 5) return { label: 'Cukup', color: 'd97706' }
  return { label: 'Perlu Latihan', color: 'dc2626' }
}

export const MONTHS = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']

export function formatPeriodLabel(month, year, endMonth, endYear) {
  if (endMonth === month && endYear === year) return `${MONTHS[month]} ${year}`
  if (endYear === year) return `${MONTHS[month]} - ${MONTHS[endMonth]} ${year}`
  return `${MONTHS[month]} ${year} - ${MONTHS[endMonth]} ${endYear}`
}
