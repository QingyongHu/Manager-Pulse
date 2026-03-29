import { state, persistStreams, persistSyncMeta, recalculateStatusLights } from '../store/state.js'
import { fetchDataFile, writeDataFile } from './github.js'
import { showToast } from '../store/actions.js'
import { getJSON, setJSON, STORAGE_KEYS } from '../services/storage.js'
import { today } from '../utils/date.js'

export async function pullFromGitHub() {
  if (!state.settings.github.token || !state.settings.github.owner || !state.settings.github.repo) {
    return
  }

  try {
    state.syncMeta.syncStatus = 'syncing'
    persistSyncMeta()

    const { content, sha } = await fetchDataFile(state.settings.github)

    if (content === null) {
      // File doesn't exist yet — push current data
      await pushToGitHub()
      return
    }

    const storedSha = state.syncMeta.remoteSha

    if (sha === storedSha) {
      // Remote unchanged
      state.syncMeta.syncStatus = 'idle'
      state.syncMeta.lastSyncTime = today()
      persistSyncMeta()
      return
    }

    // Remote has changed — merge
    const localStreams = [...state.workStreams]
    const remoteStreams = content.workStreams || content // support both formats

    const merged = mergeStreams(localStreams, remoteStreams)
    state.workStreams.splice(0, state.workStreams.length, ...merged)
    recalculateStatusLights()
    persistStreams()

    state.syncMeta.remoteSha = sha
    state.syncMeta.lastSyncTime = today()
    state.syncMeta.syncStatus = 'idle'
    state.syncMeta.hasPendingChanges = false
    persistSyncMeta()

  } catch (e) {
    console.error('Pull failed:', e)
    state.syncMeta.syncStatus = 'error'
    persistSyncMeta()
    throw e
  }
}

export async function pushToGitHub() {
  if (!state.settings.github.token || !state.settings.github.owner || !state.settings.github.repo) {
    return
  }

  try {
    state.syncMeta.syncStatus = 'syncing'
    persistSyncMeta()

    // Get current sha
    let currentSha = state.syncMeta.remoteSha
    if (!currentSha) {
      const remote = await fetchDataFile(state.settings.github)
      currentSha = remote.sha
    }

    const data = {
      workStreams: state.workStreams,
      exportedAt: new Date().toISOString(),
    }

    const result = await writeDataFile(
      state.settings.github,
      data,
      currentSha,
      `Update ${today()}`
    )

    state.syncMeta.remoteSha = result.sha
    state.syncMeta.lastSyncTime = today()
    state.syncMeta.syncStatus = 'idle'
    state.syncMeta.hasPendingChanges = false
    persistSyncMeta()

  } catch (e) {
    if (e.message === 'CONFLICT') {
      // Pull, merge, then retry
      try {
        await pullFromGitHub()
        // Retry push after merge
        const data = { workStreams: state.workStreams, exportedAt: new Date().toISOString() }
        const remote = await fetchDataFile(state.settings.github)
        const result = await writeDataFile(state.settings.github, data, remote.sha, `Update ${today()} (merged)`)
        state.syncMeta.remoteSha = result.sha
        state.syncMeta.lastSyncTime = today()
        state.syncMeta.syncStatus = 'idle'
        state.syncMeta.hasPendingChanges = false
        persistSyncMeta()
      } catch (retryErr) {
        console.error('Conflict resolution failed:', retryErr)
        state.syncMeta.syncStatus = 'error'
        persistSyncMeta()
        showToast('同步冲突，请刷新后重试', 'error')
      }
    } else {
      console.error('Push failed:', e)
      state.syncMeta.syncStatus = 'error'
      persistSyncMeta()
    }
  }
}

export async function syncCycle() {
  if (!state.isOnline) return
  if (!state.settings.github.token) return

  try {
    await pullFromGitHub()
    if (state.syncMeta.hasPendingChanges) {
      await pushToGitHub()
    }
  } catch (e) {
    console.error('Sync cycle failed:', e)
  }
}

function mergeStreams(local, remote) {
  const localMap = new Map(local.map(ws => [ws.id, ws]))
  const remoteMap = new Map(remote.map(ws => [ws.id, ws]))
  const allIds = new Set([...localMap.keys(), ...remoteMap.keys()])
  const merged = []

  for (const id of allIds) {
    const localWs = localMap.get(id)
    const remoteWs = remoteMap.get(id)

    if (!localWs) {
      merged.push(remoteWs)
      continue
    }
    if (!remoteWs) {
      merged.push(localWs)
      continue
    }

    // Last-writer-wins by lastUpdateTime
    const localTime = localWs.lastUpdateTime || ''
    const remoteTime = remoteWs.lastUpdateTime || ''

    if (localTime >= remoteTime) {
      // Merge histories: union by timestamp
      const historyMap = new Map()
      localWs.history.forEach(h => historyMap.set(h.time + h.content, h))
      remoteWs.history.forEach(h => {
        if (!historyMap.has(h.time + h.content)) {
          historyMap.set(h.time + h.content, h)
        }
      })
      merged.push({
        ...localWs,
        history: [...historyMap.values()].sort((a, b) => b.time.localeCompare(a.time)),
      })
    } else {
      const historyMap = new Map()
      remoteWs.history.forEach(h => historyMap.set(h.time + h.content, h))
      localWs.history.forEach(h => {
        if (!historyMap.has(h.time + h.content)) {
          historyMap.set(h.time + h.content, h)
        }
      })
      merged.push({
        ...remoteWs,
        history: [...historyMap.values()].sort((a, b) => b.time.localeCompare(a.time)),
      })
    }
  }

  return merged
}
