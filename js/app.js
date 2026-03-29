import { createApp } from 'vue'
import { router } from './router.js'
import { AppShell } from './components/AppShell.js'
import { state, initializeState } from './store/state.js'
import { syncCycle } from './api/sync.js'
import { showToast } from './store/actions.js'
import { shouldRemindExport } from './services/export.js'

const app = createApp(AppShell)
app.use(router)

app.config.globalProperties.$state = state

initializeState()

app.mount('#app')

// Auto-sync interval
let syncIntervalId = null

function startAutoSync() {
  if (syncIntervalId) clearInterval(syncIntervalId)
  const interval = state.settings.autoSyncInterval || 300000
  syncIntervalId = setInterval(() => {
    if (state.isOnline && state.settings.github.token) {
      syncCycle().catch(console.error)
    }
  }, interval)
}

startAutoSync()

// Initial sync if configured
if (state.isOnline && state.settings.github.token) {
  syncCycle().catch(console.error)
}

// Sync when coming back online
window.addEventListener('online', () => {
  if (state.settings.github.token) {
    syncCycle().catch(console.error)
  }
  startAutoSync()
})

// Export reminder
setTimeout(() => {
  if (shouldRemindExport()) {
    showToast('已超过 7 天未导出数据，建议备份', 'warning', 5000)
  }
}, 3000)
