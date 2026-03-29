const STORAGE_KEYS = {
  WORK_STREAMS: 'mp_workStreams',
  SETTINGS: 'mp_settings',
  SYNC_META: 'mp_syncMeta',
  LAST_EXPORT: 'mp_lastExport',
  BACKUP: 'mp_backup',
}

export function getJSON(key) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch (e) {
    console.error(`storage.getJSON error for key "${key}":`, e)
    return null
  }
}

export function setJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (e) {
    console.error(`storage.setJSON error for key "${key}":`, e)
    if (e.name === 'QuotaExceededError') {
      console.warn('localStorage quota exceeded')
    }
  }
}

export function removeKey(key) {
  localStorage.removeItem(key)
}

export function getStorageUsage() {
  let total = 0
  for (let key in localStorage) {
    if (localStorage.hasOwnProperty(key)) {
      total += localStorage[key].length * 2 // UTF-16
    }
  }
  return total
}

export { STORAGE_KEYS }
