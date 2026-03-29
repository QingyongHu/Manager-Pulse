import { ref, onMounted, onUnmounted } from 'vue'
import { state } from '../store/state.js'
import { syncCycle } from '../api/sync.js'

export function useSync() {
  let intervalId = null

  function startAutoSync() {
    stopAutoSync()
    const ms = state.settings.autoSyncInterval || 300000
    intervalId = setInterval(syncCycle, ms)
  }

  function stopAutoSync() {
    if (intervalId) {
      clearInterval(intervalId)
      intervalId = null
    }
  }

  async function manualSync() {
    await syncCycle()
  }

  onMounted(() => {
    // Initial sync
    if (state.isOnline && state.settings.github.token) {
      syncCycle()
    }
    startAutoSync()

    // Auto sync when coming back online
    window.addEventListener('online', syncCycle)
  })

  onUnmounted(() => {
    stopAutoSync()
    window.removeEventListener('online', syncCycle)
  })

  return {
    manualSync,
    startAutoSync,
    stopAutoSync,
  }
}
