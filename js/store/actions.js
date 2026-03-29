import { state, persistStreams, persistSettings, recalculateStatusLights, persistSyncMeta } from './state.js'
import { today } from '../utils/date.js'

let toastId = 0

export function addWorkStream(data) {
  const ws = {
    id: 'ws-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8),
    role: data.role,
    name: data.name,
    priority: data.priority || '中',
    currentStatus: data.currentStatus || '',
    lastUpdateTime: data.currentStatus ? today() : '',
    statusLight: data.currentStatus ? 'green' : 'red',
    archived: false,
    history: data.currentStatus
      ? [{ time: today(), type: 'manual', content: data.currentStatus }]
      : [],
  }
  state.workStreams.push(ws)
  persistStreams()
  state.syncMeta.hasPendingChanges = true
  persistSyncMeta()
  return ws
}

export function quickUpdate(streamId, content) {
  const ws = state.workStreams.find(s => s.id === streamId)
  if (!ws) return

  const entry = { time: today(), type: 'manual', content }
  ws.history.unshift(entry)
  ws.currentStatus = content
  ws.lastUpdateTime = today()
  ws.statusLight = 'green'
  persistStreams()
  state.syncMeta.hasPendingChanges = true
  persistSyncMeta()
}

export function batchUpdate(updates) {
  updates.forEach(({ streamId, content }) => {
    const ws = state.workStreams.find(s => s.id === streamId)
    if (!ws) return
    const entry = { time: today(), type: 'manual', content }
    ws.history.unshift(entry)
    ws.currentStatus = content
    ws.lastUpdateTime = today()
    ws.statusLight = 'green'
  })
  recalculateStatusLights()
  persistStreams()
  state.syncMeta.hasPendingChanges = true
  persistSyncMeta()
}

export function editWorkStream(streamId, data) {
  const ws = state.workStreams.find(s => s.id === streamId)
  if (!ws) return
  if (data.name !== undefined) ws.name = data.name
  if (data.role !== undefined) ws.role = data.role
  if (data.priority !== undefined) ws.priority = data.priority
  if (data.currentStatus !== undefined) {
    ws.currentStatus = data.currentStatus
    ws.lastUpdateTime = data.currentStatus ? today() : ws.lastUpdateTime
    ws.statusLight = data.currentStatus ? 'green' : 'red'
    if (data.currentStatus) {
      ws.history.unshift({ time: today(), type: 'manual', content: data.currentStatus })
    }
  }
  persistStreams()
  state.syncMeta.hasPendingChanges = true
  persistSyncMeta()
}

export function archiveWorkStream(streamId) {
  const ws = state.workStreams.find(s => s.id === streamId)
  if (!ws) return
  ws.archived = true
  persistStreams()
  state.syncMeta.hasPendingChanges = true
  persistSyncMeta()
}

export function restoreWorkStream(streamId) {
  const ws = state.workStreams.find(s => s.id === streamId)
  if (!ws) return
  ws.archived = false
  persistStreams()
  state.syncMeta.hasPendingChanges = true
  persistSyncMeta()
}

export function deleteWorkStream(streamId) {
  const idx = state.workStreams.findIndex(s => s.id === streamId)
  if (idx === -1) return
  state.workStreams.splice(idx, 1)
  persistStreams()
  state.syncMeta.hasPendingChanges = true
  persistSyncMeta()
}

export function updateSettings(newSettings) {
  Object.assign(state.settings, newSettings)
  persistSettings()
  if (newSettings.thresholds) {
    recalculateStatusLights()
    persistStreams()
  }
}

export function addSystemWarning(streamId, message) {
  const ws = state.workStreams.find(s => s.id === streamId)
  if (!ws) return
  ws.history.unshift({ time: today(), type: 'system', content: message })
  persistStreams()
}

export function replaceAllWorkStreams(newStreams) {
  state.workStreams.splice(0, state.workStreams.length, ...newStreams)
  recalculateStatusLights()
  persistStreams()
  state.syncMeta.hasPendingChanges = true
  persistSyncMeta()
}

export function showToast(message, type = 'info', duration = 3000) {
  const id = ++toastId
  state.toasts.push({ id, message, type })
  if (duration > 0) {
    setTimeout(() => removeToast(id), duration)
  }
}

export function removeToast(id) {
  const idx = state.toasts.findIndex(t => t.id === id)
  if (idx !== -1) state.toasts.splice(idx, 1)
}
