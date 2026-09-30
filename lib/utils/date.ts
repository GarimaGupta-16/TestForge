export const APP_TIMEZONE = 'Asia/Kolkata'

/**
 * Returns the YYYY-MM-DD date string for a given date in the specified timezone (default: Asia/Kolkata).
 */
export function getLocalDateString(
  dateInput: string | Date | number,
  timeZone: string = APP_TIMEZONE
): string {
  const date = new Date(dateInput)
  if (isNaN(date.getTime())) return ''

  // 'en-CA' locale outputs YYYY-MM-DD format strictly
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  return formatter.format(date)
}

/**
 * Returns whether a given ISO date string or Date falls on today's calendar date in the application timezone.
 */
export function isTodayInAppTimezone(
  dateInput: string | Date | number | null | undefined,
  timeZone: string = APP_TIMEZONE
): boolean {
  if (!dateInput) return false
  const targetDateStr = getLocalDateString(dateInput, timeZone)
  const todayStr = getLocalDateString(new Date(), timeZone)
  return Boolean(targetDateStr && targetDateStr === todayStr)
}
