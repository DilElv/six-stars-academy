// Mirrors server-next/lib/assessmentFields.js (separate Next.js app, no
// shared package) — keep field keys/labels in sync with that file and with
// the Assessment model in server-next/prisma/schema.prisma.
export const FIELD_PLAYER_CATEGORIES = [
  {
    key: 'teknik',
    title: 'I. Teknik / Skill',
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
  if (value >= 8) return { label: 'Baik', color: 'text-emerald-600' }
  if (value >= 5) return { label: 'Cukup', color: 'text-amber-600' }
  return { label: 'Perlu Latihan', color: 'text-red-600' }
}

export function formatPeriodLabel(MONTHS, month, year, endMonth, endYear) {
  if (endMonth === month && endYear === year) return `${MONTHS[month]} ${year}`
  if (endYear === year) return `${MONTHS[month]} - ${MONTHS[endMonth]} ${year}`
  return `${MONTHS[month]} ${year} - ${MONTHS[endMonth]} ${endYear}`
}
