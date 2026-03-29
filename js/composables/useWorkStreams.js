import { computed } from 'vue'
import { state, ROLES } from '../store/state.js'
import { getDaysSinceUpdate } from '../services/status.js'

const PRIORITY_ORDER = { '高': 0, '中': 1, '低': 2 }
const STATUS_ORDER = { red: 0, yellow: 1, green: 2 }

export function useWorkStreams() {
  const activeStreams = computed(() =>
    state.workStreams.filter(ws => !ws.archived)
  )

  const archivedStreams = computed(() =>
    state.workStreams.filter(ws => ws.archived)
  )

  function streamsByRole(roleId) {
    return computed(() =>
      activeStreams.value.filter(ws => ws.role === roleId)
    )
  }

  const statsCounts = computed(() => {
    const active = activeStreams.value
    return {
      red: active.filter(ws => ws.statusLight === 'red').length,
      yellow: active.filter(ws => ws.statusLight === 'yellow').length,
      green: active.filter(ws => ws.statusLight === 'green').length,
      high: active.filter(ws => ws.priority === '高').length,
      medium: active.filter(ws => ws.priority === '中').length,
      low: active.filter(ws => ws.priority === '低').length,
      total: active.length,
    }
  })

  function roleStats(roleId) {
    const streams = activeStreams.value.filter(ws => ws.role === roleId)
    return {
      total: streams.length,
      red: streams.filter(ws => ws.statusLight === 'red').length,
      yellow: streams.filter(ws => ws.statusLight === 'yellow').length,
      green: streams.filter(ws => ws.statusLight === 'green').length,
    }
  }

  const mustPushToday = computed(() => {
    const active = activeStreams.value

    // Tier 1: High priority + red/yellow
    const tier1 = active
      .filter(ws => ws.priority === '高' && (ws.statusLight === 'red' || ws.statusLight === 'yellow'))
      .sort(sortByStaleness)

    // Tier 2: High priority + green (updated within 3 days)
    const tier2 = active
      .filter(ws => ws.priority === '高' && ws.statusLight === 'green' && getDaysSinceUpdate(ws.lastUpdateTime) <= 3)
      .sort(sortByStaleness)

    // Tier 3: Medium priority + red (stagnant > 10 days)
    const tier3 = active
      .filter(ws => ws.priority === '中' && ws.statusLight === 'red')
      .sort(sortByStaleness)

    return [...tier1, ...tier2, ...tier3].slice(0, 7)
  })

  const recentUpdates = computed(() => {
    const allHistory = []
    state.workStreams.forEach(ws => {
      ws.history.filter(h => h.type === 'manual').forEach(h => {
        allHistory.push({ ...h, streamName: ws.name, streamId: ws.id, role: ws.role })
      })
    })
    allHistory.sort((a, b) => b.time.localeCompare(a.time))
    return allHistory.slice(0, 5)
  })

  function sortWorkStreams(streams) {
    return [...streams].sort((a, b) => {
      const pa = PRIORITY_ORDER[a.priority] ?? 1
      const pb = PRIORITY_ORDER[b.priority] ?? 1
      if (pa !== pb) return pa - pb

      const sa = STATUS_ORDER[a.statusLight] ?? 2
      const sb = STATUS_ORDER[b.statusLight] ?? 2
      if (sa !== sb) return sa - sb

      const da = a.lastUpdateTime || ''
      const db = b.lastUpdateTime || ''
      return da.localeCompare(db)
    })
  }

  function filterWorkStreams(streams, filter) {
    switch (filter) {
      case 'red': return streams.filter(ws => ws.statusLight === 'red')
      case 'yellow': return streams.filter(ws => ws.statusLight === 'yellow')
      case 'green': return streams.filter(ws => ws.statusLight === 'green')
      case 'high': return streams.filter(ws => ws.priority === '高')
      default: return streams
    }
  }

  return {
    activeStreams,
    archivedStreams,
    streamsByRole,
    statsCounts,
    roleStats,
    mustPushToday,
    recentUpdates,
    sortWorkStreams,
    filterWorkStreams,
  }
}

function sortByStaleness(a, b) {
  const da = getDaysSinceUpdate(a.lastUpdateTime)
  const db = getDaysSinceUpdate(b.lastUpdateTime)
  return db - da
}
