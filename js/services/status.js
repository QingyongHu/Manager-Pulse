import { daysBetween } from '../utils/date.js'

export function calculateStatusLight(lastUpdateTime, thresholds = {}) {
  const greenDays = thresholds.green ?? 5
  const yellowDays = thresholds.yellow ?? 10

  if (!lastUpdateTime) return 'red'

  const days = daysBetween(lastUpdateTime, new Date().toISOString().slice(0, 10))

  if (days <= greenDays) return 'green'
  if (days <= yellowDays) return 'yellow'
  return 'red'
}

export function getDaysSinceUpdate(lastUpdateTime) {
  if (!lastUpdateTime) return Infinity
  return daysBetween(lastUpdateTime, new Date().toISOString().slice(0, 10))
}

export function shouldAutoWarn(workStream, thresholds = {}) {
  const days = getDaysSinceUpdate(workStream.lastUpdateTime)
  const yellowDays = thresholds.yellow ?? 10

  if (days >= yellowDays) {
    const lastSystemWarn = workStream.history
      ?.filter(h => h.type === 'system')
      .sort((a, b) => b.time.localeCompare(a.time))[0]
    if (lastSystemWarn) {
      const daysSinceWarn = daysBetween(lastSystemWarn.time, new Date().toISOString().slice(0, 10))
      return daysSinceWarn >= yellowDays
    }
    return true
  }
  return false
}
