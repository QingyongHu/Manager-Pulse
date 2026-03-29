import { getJSON, setJSON, STORAGE_KEYS } from './storage.js'
import { state } from '../store/state.js'
import { replaceAllWorkStreams, showToast, updateSettings } from '../store/actions.js'

export function exportData() {
  const data = {
    version: '2.1',
    exportedAt: new Date().toISOString(),
    workStreams: state.workStreams,
    settings: {
      thresholds: state.settings.thresholds,
      roleNames: state.settings.roleNames,
    },
  }

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `manager-pulse-backup-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)

  setJSON(STORAGE_KEYS.LAST_EXPORT, new Date().toISOString())
  showToast('数据已导出', 'success')
}

export function importData(jsonString) {
  let data
  try {
    data = JSON.parse(jsonString)
  } catch {
    throw new Error('无效的 JSON 格式')
  }

  if (!data.workStreams || !Array.isArray(data.workStreams)) {
    throw new Error('数据格式不正确：缺少 workStreams 数组')
  }

  // Validate each work stream
  for (const ws of data.workStreams) {
    if (!ws.id || !ws.role || !ws.name) {
      throw new Error(`工作线数据不完整：${ws.name || ws.id || '未知'}`)
    }
    if (!['R1', 'R2', 'R3', 'R4'].includes(ws.role)) {
      throw new Error(`无效的角色 ID：${ws.role}`)
    }
  }

  replaceAllWorkStreams(data.workStreams)

  if (data.settings) {
    if (data.settings.thresholds) {
      updateSettings({ thresholds: data.settings.thresholds })
    }
    if (data.settings.roleNames) {
      updateSettings({ roleNames: data.settings.roleNames })
    }
  }

  showToast(`已导入 ${data.workStreams.length} 条工作线`, 'success')
}

export function shouldRemindExport() {
  const lastExport = getJSON(STORAGE_KEYS.LAST_EXPORT)
  if (!lastExport) return true
  const daysSince = Math.floor((Date.now() - new Date(lastExport).getTime()) / (1000 * 60 * 60 * 24))
  return daysSince >= 7
}
