export const WEEKDAYS = [
  { value: 'senin', label: 'Senin', jsDay: 1 },
  { value: 'selasa', label: 'Selasa', jsDay: 2 },
  { value: 'rabu', label: 'Rabu', jsDay: 3 },
  { value: 'kamis', label: 'Kamis', jsDay: 4 },
  { value: 'jumat', label: 'Jumat', jsDay: 5 },
  { value: 'sabtu', label: 'Sabtu', jsDay: 6 },
  { value: 'minggu', label: 'Minggu', jsDay: 0 },
]

export function weekdayLabel(value) {
  return WEEKDAYS.find((w) => w.value === value)?.label || value
}

export function weekdayForDate(date) {
  const jsDay = date.getDay()
  return WEEKDAYS.find((w) => w.jsDay === jsDay)?.value
}
