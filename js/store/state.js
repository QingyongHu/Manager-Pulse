import { reactive, computed } from 'vue'
import { getJSON, setJSON, STORAGE_KEYS } from '../services/storage.js'
import { calculateStatusLight } from '../services/status.js'
import { today } from '../utils/date.js'

const ROLES = {
  R1: { id: 'R1', name: '项目负责人', icon: '👔' },
  R2: { id: 'R2', name: '一家之主', icon: '🏠' },
  R3: { id: 'R3', name: '创业 Leader', icon: '🚀' },
  R4: { id: 'R4', name: '博导 & 科研工作者', icon: '🎓' },
}

const DEFAULT_SETTINGS = {
  github: { token: '', owner: '', repo: '', path: 'data.json', branch: 'data' },
  ai: { apiKey: '', model: 'GLM-5.1', baseUrl: '', workerUrl: '' },
  thresholds: { green: 5, yellow: 10 },
  roleNames: {
    R1: '项目负责人',
    R2: '一家之主',
    R3: '创业 Leader',
    R4: '博导 & 科研',
  },
  autoSyncInterval: 300000,
}

export const state = reactive({
  workStreams: [],
  settings: { ...DEFAULT_SETTINGS },
  syncMeta: {
    remoteSha: null,
    lastSyncTime: null,
    syncStatus: 'idle',
    hasPendingChanges: false,
  },
  offlineDrafts: [],
  toasts: [],
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  isMobile: typeof window !== 'undefined' ? window.matchMedia('(max-width: 767px)').matches : false,
})

export function initializeState() {
  // Load work streams
  const savedStreams = getJSON(STORAGE_KEYS.WORK_STREAMS)
  if (savedStreams && savedStreams.length > 0) {
    state.workStreams = savedStreams
  } else {
    // Load seed data synchronously via XHR (only at init)
    try {
      const xhr = new XMLHttpRequest()
      xhr.open('GET', 'data/seed.json', false)
      xhr.send()
      if (xhr.status === 200) {
        state.workStreams = JSON.parse(xhr.responseText)
        persistStreams()
      }
    } catch (e) {
      console.warn('Failed to load seed data:', e)
      state.workStreams = []
    }
  }

  // Load settings
  const savedSettings = getJSON(STORAGE_KEYS.SETTINGS)
  if (savedSettings) {
    state.settings = { ...DEFAULT_SETTINGS, ...savedSettings }
  }

  // Load sync meta
  const savedSyncMeta = getJSON(STORAGE_KEYS.SYNC_META)
  if (savedSyncMeta) {
    state.syncMeta = { ...state.syncMeta, ...savedSyncMeta }
  }

  // Recalculate status lights
  recalculateStatusLights()

  // Setup mobile detection
  if (typeof window !== 'undefined') {
    const mql = window.matchMedia('(max-width: 767px)')
    mql.addEventListener('change', (e) => { state.isMobile = e.matches })
  }

  // Setup online/offline detection
  if (typeof window !== 'undefined') {
    window.addEventListener('online', () => { state.isOnline = true })
    window.addEventListener('offline', () => { state.isOnline = false })
  }
}

export function recalculateStatusLights() {
  state.workStreams.forEach(ws => {
    ws.statusLight = calculateStatusLight(ws.lastUpdateTime, state.settings.thresholds)
  })
}

export function persistStreams() {
  setJSON(STORAGE_KEYS.WORK_STREAMS, state.workStreams)
}

export function persistSettings() {
  setJSON(STORAGE_KEYS.SETTINGS, state.settings)
}

export function persistSyncMeta() {
  setJSON(STORAGE_KEYS.SYNC_META, state.syncMeta)
}

export { ROLES, DEFAULT_SETTINGS }
