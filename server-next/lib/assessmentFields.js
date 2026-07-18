export const ASSESSMENT_CATEGORIES = [
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

export function scoreCategory(value) {
  if (value >= 8) return { label: 'Baik', color: '10b981' }
  if (value >= 5) return { label: 'Cukup', color: 'd97706' }
  return { label: 'Perlu Latihan', color: 'dc2626' }
}

export const MONTHS = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
