import {
  format,
  isToday,
  isYesterday,
  differenceInCalendarDays,
  isValid,
} from 'date-fns'

export function groupLabel(ts: number | null): string {
  if (!ts) return 'Undated'
  const d = new Date(ts)
  if (!isValid(d)) return 'Undated'
  if (isToday(d)) return 'Today'
  if (isYesterday(d)) return 'Yesterday'
  const days = differenceInCalendarDays(new Date(), d)
  if (days <= 7) return 'Previous 7 days'
  if (days <= 30) return 'Previous 30 days'
  return format(d, 'LLLL yyyy')
}

export const GROUP_ORDER = [
  'Today',
  'Yesterday',
  'Previous 7 days',
  'Previous 30 days',
]
