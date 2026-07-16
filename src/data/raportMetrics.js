function avg(arr) {
  if (!arr || arr.length === 0) return 0
  const sum = arr.reduce((a, b) => a + b, 0)
  return Math.round(sum / arr.length)
}

function avgItems(data, keys) {
  return avg(keys.map((k) => data?.[k] ?? 0))
}

export const gkMetrics = {
  position: 'GK',
  categories: [
    {
      id: 'teknik',
      label: 'I. TEKNIK / SKILL',
      radarKey: 'teknik',
      items: [
        { key: 'catching', label: 'Catching the Ball', desc: 'Menangkap bola' },
        { key: 'kicking', label: 'Kicking the Ball', desc: 'Menendang bola ke sasaran' },
        { key: 'throwing', label: 'Throwing the Ball', desc: 'Melempar bola sasaran' },
        { key: 'volleying', label: 'Volleying', desc: 'Menendang bola dengan teknik volley' },
        { key: 'drop_kick', label: 'Drop Kick', desc: 'Menendang bola dengan posisi bola berada di tanah' },
        { key: 'goal_kick', label: 'Goal Kick', desc: 'Tendangan gawang' },
        { key: 'footwork', label: 'Footwork', desc: 'Harmonisasi gerakan kaki' },
        { key: 'gk_1v1', label: '1 vs 1 Situation', desc: 'Situasi 1 lawan 1' },
      ],
    },
    {
      id: 'taktik',
      label: 'II. TAKTIK',
      radarKey: 'taktik',
      subGroups: [
        {
          id: 'attacking',
          label: 'A. ATTACKING (Menyerang)',
          items: [
            { key: 'gk_att_position', label: 'Position', desc: 'Penempatan posisi' },
            { key: 'attacking_principles', label: 'Attacking Principles', desc: 'Pemahaman dasar-dasar taktik menyerang' },
            { key: 'possession', label: 'Posession', desc: 'Penguasaan bola yang melibatkan lebih dari satu pemain' },
            { key: 'transition_plus', label: 'Transition (+)', desc: 'Peralihan dari situasi bertahan ke situasi menyerang' },
            { key: 'switching_play', label: 'Switching Play', desc: 'Merubah arah permainan dari sisi lapangan ke sisi lapangan lainnya' },
          ],
        },
        {
          id: 'defending',
          label: 'B. DEFENDING (Bertahan)',
          items: [
            { key: 'gk_def_position', label: 'Position', desc: 'Penempatan posisi' },
            { key: 'deal_with_crossing', label: 'Deal with Crossing', desc: 'Mengatasi bola silang' },
            { key: 'deal_with_corner_kick', label: 'Deal with Corner Kick', desc: 'Mengatasi bola dari tendangan sudut' },
            { key: 'deal_with_free_kick', label: 'Deal with Free Kick', desc: 'Mengatasi bola free kick' },
            { key: 'deal_with_long_pass', label: 'Deal with Long Pass', desc: 'Mengatasi bola langsung ke kotak penalty situasi openplay' },
            { key: 'gk_def_1v1', label: '1 vs 1 Situation', desc: 'Situasi 1 lawan 1' },
          ],
        },
      ],
    },
    {
      id: 'fisik',
      label: 'III. FISIK',
      radarKey: 'fisik',
      subGroups: [
        {
          id: 'strength',
          label: 'A. STRENGTH (Kekuatan)',
          items: [
            { key: 'maximal_strength', label: 'Maximal Strength', desc: 'Kekuatan Maksimal' },
          ],
        },
        {
          id: 'endurance',
          label: 'B. ENDURANCE (Daya Tahan)',
          items: [
            { key: 'aerobic_capacity', label: 'Aerobic Capacity', desc: 'Kemampuan tubuh bekerja lama tanpa kelelahan berlebihan' },
          ],
        },
        {
          id: 'speed',
          label: 'C. SPEED (Kecepatan)',
          items: [
            { key: 'reaction', label: 'Reaction', desc: 'Kecepatan bereaksi' },
            { key: 'acceleration', label: 'Acceleration', desc: 'Peningkatan kecepatan' },
            { key: 'maximal_speed', label: 'Maximal Speed', desc: 'Kecepatan maksimal' },
            { key: 'speed_endurance', label: 'Speed Endurance', desc: 'Daya tahan berlari dengan kecepatan maksimal' },
          ],
        },
        {
          id: 'awareness',
          label: 'D. AWARENESS',
          items: [
            { key: 'awareness', label: 'Awareness', desc: 'Kemampuan mengidentifikasi secara efisien situasi di sekitarnya' },
          ],
        },
        {
          id: 'power',
          label: 'E. POWER',
          items: [
            { key: 'power', label: 'Power', desc: 'Kombinasi antara kecepatan dengan kekuatan' },
          ],
        },
      ],
    },
    {
      id: 'mental',
      label: 'IV. MENTAL',
      radarKey: 'mental',
      items: [
        { key: 'self_confidence', label: 'Self Confidence', desc: 'Memiliki kepercayaan diri' },
        { key: 'decision', label: 'Decision', desc: 'Kecepatan & ketepatan dalam mengambil keputusan' },
        { key: 'leadership', label: 'Leadership', desc: 'Sikap kepemimpinan' },
        { key: 'enthusiasm', label: 'Enthusiasm', desc: 'Sikap antusiasme' },
        { key: 'communication', label: 'Communication', desc: 'Kemampuan berkomunikasi' },
        { key: 'discipline', label: 'Discipline', desc: 'Memiliki sikap disiplin' },
      ],
    },
  ],
  getRadarData(data) {
    const m = data?.metrics_data || {}
    return this.categories.map((cat) => {
      const keys = []
      if (cat.items) {
        for (const item of cat.items) keys.push(item.key)
      }
      if (cat.subGroups) {
        for (const sg of cat.subGroups) {
          for (const item of sg.items) keys.push(item.key)
        }
      }
      return { metric: cat.label.split('. ')[1] || cat.label, score: avgItems(m, keys) }
    })
  },
  getAllKeys() {
    const keys = []
    for (const cat of this.categories) {
      if (cat.items) for (const item of cat.items) keys.push(item.key)
      if (cat.subGroups) for (const sg of cat.subGroups) for (const item of sg.items) keys.push(item.key)
    }
    return keys
  },
}

export const outfieldMetrics = {
  position: 'Outfield',
  categories: [
    {
      id: 'teknik',
      label: 'I. TEKNIK / SKILL',
      radarKey: 'teknik',
      items: [
        { key: 'passing', label: 'Passing', desc: 'Mengarahkan bola ke sasaran' },
        { key: 'control', label: 'Control', desc: 'Mengendalikan bola' },
        { key: 'running_with_ball', label: 'Running With the Ball', desc: 'Berlari lurus menggiring bola dengan kecepatan maksimal' },
        { key: 'dribbling', label: 'Dribbling', desc: 'Berlari sambil menggiring bola dengan berganti-ganti arah' },
        { key: 'shooting', label: 'Shooting', desc: 'Menendang bola ke arah gawang lawan untuk menciptakan gol' },
        { key: 'long_passing', label: 'Long Passing', desc: 'Memberikan umpan jarak jauh' },
        { key: 'of_1v1_att', label: '1 vs 1 Attacking', desc: 'Melewati lawan dengan bola dalam situasi 1 lawan 1' },
        { key: 'of_1v1_def', label: '1 vs 1 Defending', desc: 'Kemampuan bertahan 1 lawan 1' },
      ],
    },
    {
      id: 'taktik',
      label: 'II. TAKTIK',
      radarKey: 'taktik',
      subGroups: [
        {
          id: 'attacking',
          label: 'A. ATTACKING (Menyerang)',
          items: [
            { key: 'of_attacking_principles', label: 'Attacking Principles', desc: 'Pemahaman dasar-dasar taktik menyerang' },
            { key: 'of_possession', label: 'Posession', desc: 'Penguasaan bola yang melibatkan lebih dari satu pemain' },
            { key: 'of_transition_plus', label: 'Transition (+)', desc: 'Peralihan dari situasi bertahan ke situasi menyerang' },
            { key: 'combination_play', label: 'Combination Play', desc: 'Kombinasi passing bersama teman dengan cepat dan efektif' },
            { key: 'of_switching_play', label: 'Switching Play', desc: 'Merubah arah permainan dari sisi lapangan ke sisi lainnya' },
            { key: 'playing_out_back', label: 'Playing Out From the Back', desc: 'Mengarahkan bola secara cepat ke depan dari area pertahanan' },
            { key: 'finishing_final_third', label: 'Finishing in the Final Third', desc: 'Eksekusi peluang menciptakan gol di area pertahanan lawan' },
          ],
        },
        {
          id: 'defending',
          label: 'B. DEFENDING (Bertahan)',
          items: [
            { key: 'of_defending_principles', label: 'Defending Principles', desc: 'Pemahaman dasar-dasar taktik bertahan' },
            { key: 'zonal_defending', label: 'Zonal Defending', desc: 'Penempatan posisi dalam menjaga daerah' },
            { key: 'pressing', label: 'Pressing', desc: 'Memberikan tekanan kepada lawan dengan ketat' },
            { key: 'retreat_recovery', label: 'Retreat & Recovery', desc: 'Pergerakan kembali ke daerah pertahanan untuk reorganisasi' },
            { key: 'compactness', label: 'Compactness', desc: 'Kebersamaan dalam membangun pertahanan' },
            { key: 'of_transition_minus', label: 'Transition (-)', desc: 'Peralihan dari situasi menyerang ke situasi bertahan' },
          ],
        },
      ],
    },
    {
      id: 'fisik',
      label: 'III. FISIK',
      radarKey: 'fisik',
      subGroups: [
        {
          id: 'strength',
          label: 'A. STRENGTH (Kekuatan)',
          items: [
            { key: 'of_maximal_strength', label: 'Maximal Strength', desc: 'Kekuatan Maksimal' },
          ],
        },
        {
          id: 'endurance',
          label: 'B. ENDURANCE (Daya Tahan)',
          items: [
            { key: 'of_aerobic_capacity', label: 'Aerobic Capacity', desc: 'Kemampuan tubuh bekerja lama tanpa kelelahan berlebihan' },
          ],
        },
        {
          id: 'speed',
          label: 'C. SPEED (Kecepatan)',
          items: [
            { key: 'of_reaction', label: 'Reaction', desc: 'Kecepatan bereaksi' },
            { key: 'of_acceleration', label: 'Acceleration', desc: 'Peningkatan kecepatan' },
            { key: 'of_maximal_speed', label: 'Maximal Speed', desc: 'Kecepatan maksimal' },
            { key: 'of_speed_endurance', label: 'Speed Endurance', desc: 'Daya tahan berlari dengan kecepatan maksimal' },
          ],
        },
        {
          id: 'awareness',
          label: 'D. AWARENESS',
          items: [
            { key: 'of_awareness', label: 'Awareness', desc: 'Kemampuan mengidentifikasi secara efisien situasi di sekitarnya' },
          ],
        },
        {
          id: 'power',
          label: 'E. POWER',
          items: [
            { key: 'of_power', label: 'Power', desc: 'Kombinasi antara kecepatan dengan kekuatan' },
          ],
        },
      ],
    },
    {
      id: 'mental',
      label: 'IV. MENTAL',
      radarKey: 'mental',
      items: [
        { key: 'of_self_confidence', label: 'Self Confidence', desc: 'Memiliki kepercayaan diri' },
        { key: 'of_decision', label: 'Decision', desc: 'Kecepatan & ketepatan dalam mengambil keputusan' },
        { key: 'of_leadership', label: 'Leadership', desc: 'Sikap kepemimpinan' },
        { key: 'of_enthusiasm', label: 'Enthusiasm', desc: 'Sikap antusiasme' },
        { key: 'of_communication', label: 'Communication', desc: 'Kemampuan berkomunikasi' },
        { key: 'of_discipline', label: 'Discipline', desc: 'Memiliki sikap disiplin' },
      ],
    },
  ],
  getRadarData(data) {
    const m = data?.metrics_data || {}
    return this.categories.map((cat) => {
      const keys = []
      if (cat.items) for (const item of cat.items) keys.push(item.key)
      if (cat.subGroups) for (const sg of cat.subGroups) for (const item of sg.items) keys.push(item.key)
      return { metric: cat.label.split('. ')[1] || cat.label, score: avgItems(m, keys) }
    })
  },
  getAllKeys() {
    const keys = []
    for (const cat of this.categories) {
      if (cat.items) for (const item of cat.items) keys.push(item.key)
      if (cat.subGroups) for (const sg of cat.subGroups) for (const item of sg.items) keys.push(item.key)
    }
    return keys
  },
}

export function getMetricsDef(positionSingkatan) {
  return positionSingkatan === 'GK' ? gkMetrics : outfieldMetrics
}

export function computeOverall(data, positionSingkatan) {
  const def = getMetricsDef(positionSingkatan)
  const keys = def.getAllKeys()
  const m = data?.metrics_data || {}
  const vals = keys.map((k) => m[k] ?? 0)
  if (vals.length === 0) return 0
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
}
