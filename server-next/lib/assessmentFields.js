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

// Simpler 4-category form for U-8-and-under players ("Form Rapor LITLE
// MAVERICK") — no Attacking/Defending split, so "Taktik & Pemahaman" maps
// onto attackingAvg directly (taktikAvg then derives as just this one part,
// same as GK's Taktik-Attacking-only edge case already handles).
export const LITTLE_MAVERICK_CATEGORIES = [
  {
    key: 'gerakMotorik',
    title: 'I. Gerak Motorik & Fisik',
    avgKey: 'fisikAvg',
    fields: [
      ['lmAgility', 'Kelincahan (Agility)'],
      ['lmSpeed', 'Kecepatan'],
      ['lmStrength', 'Kekuatan (Strength)'],
      ['lmCoordination', 'Koordinasi Tubuh'],
    ],
  },
  {
    key: 'teknikDasar',
    title: 'II. Teknik Dasar Sepakbola',
    avgKey: 'teknikAvg',
    fields: [
      ['lmDribbling', 'Dribbling'],
      ['lmPassing', 'Passing'],
      ['lmShooting', 'Shooting'],
      ['lmBallControl', 'Ball Control'],
      ['lmThrowIn', 'Throw In'],
    ],
  },
  {
    key: 'taktikPemahaman',
    title: 'III. Taktik & Pemahaman',
    avgKey: 'attackingAvg',
    fields: [
      ['lmPositioning', 'Posisi & Pergerakan'],
      ['lmDecisionMaking', 'Decision Making'],
    ],
  },
  {
    key: 'mentalSikap',
    title: 'IV. Mental & Sikap Latihan',
    avgKey: 'mentalAvg',
    fields: [
      ['lmDiscipline', 'Disiplin Latihan'],
      ['lmMotivation', 'Semangat & Motivasi'],
      ['lmTeamwork', 'Kerjasama Tim'],
      ['lmResponsiveness', 'Respon Terhadap Arahan'],
    ],
  },
]

const YOUNGEST_AGE_GROUPS = ['U-6', 'U-7', 'U-8']

// GK criteria always win regardless of age; otherwise 8-and-under gets the
// simpler Little Maverick form, everyone else gets the normal field-player
// form. Reuses Student.ageGroup (self-healing, see routes/students.js)
// instead of recomputing age here.
export function getCategoriesForStudent(position, ageGroup) {
  if (position === 'GK') return GK_CATEGORIES
  if (YOUNGEST_AGE_GROUPS.includes(ageGroup)) return LITTLE_MAVERICK_CATEGORIES
  return FIELD_PLAYER_CATEGORIES
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
