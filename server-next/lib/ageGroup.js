// One bracket per age year (not skipping U-9, U-11, U-13, U-15, U-17 like the
// old 2-year brackets did) so "kelompok umur" lines up 1:1 with how old a
// child actually is. U-6 catches everyone younger too; U-18 catches everyone
// older, since there's no upper program beyond that.
const AGE_GROUP_BRACKETS = [
  { label: 'U-6', min: 0, max: 6 },
  { label: 'U-7', min: 7, max: 7 },
  { label: 'U-8', min: 8, max: 8 },
  { label: 'U-9', min: 9, max: 9 },
  { label: 'U-10', min: 10, max: 10 },
  { label: 'U-11', min: 11, max: 11 },
  { label: 'U-12', min: 12, max: 12 },
  { label: 'U-13', min: 13, max: 13 },
  { label: 'U-14', min: 14, max: 14 },
  { label: 'U-15', min: 15, max: 15 },
  { label: 'U-16', min: 16, max: 16 },
  { label: 'U-17', min: 17, max: 17 },
  { label: 'U-18', min: 18, max: 999 },
]

export const AGE_GROUPS = AGE_GROUP_BRACKETS.map((b) => b.label)

export function calcAge(dob) {
  const birth = new Date(dob)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return age
}

export function assignAgeGroup(dob) {
  const age = calcAge(dob)
  const bracket = AGE_GROUP_BRACKETS.find((b) => age >= b.min && age <= b.max)
  return bracket ? bracket.label : AGE_GROUP_BRACKETS[0].label
}
