import { h, ref } from 'vue'
import { state } from '../store/state.js'
import { useWorkStreams } from '../composables/useWorkStreams.js'
import { restoreWorkStream, deleteWorkStream, showToast } from '../store/actions.js'
import { StatusLight } from './StatusLight.js'
import { ConfirmDialog } from './ConfirmDialog.js'
import { getDaysSinceUpdate } from '../services/status.js'

export const ArchiveView = {
  setup() {
    const { archivedStreams } = useWorkStreams()
    const showDeleteConfirm = ref(false)
    const deleteTargetId = ref('')

    function handleRestore(id) {
      restoreWorkStream(id)
      showToast('已恢复', 'success')
    }

    function confirmDelete(id) {
      deleteTargetId.value = id
      showDeleteConfirm.value = true
    }

    function doDelete() {
      deleteWorkStream(deleteTargetId.value)
      showToast('已永久删除', 'success')
      showDeleteConfirm.value = false
    }

    return () => h('div', null, [
      h('div', { class: 'page-header' }, [
        h('h1', { class: 'page-title' }, '📦 归档'),
      ]),

      archivedStreams.value.length === 0
        ? h('div', { class: 'empty-state' }, [
            h('div', { class: 'empty-state-icon' }, '📦'),
            h('div', { class: 'empty-state-text' }, '暂无归档的工作线'),
          ])
        : h('div', null,
            archivedStreams.value.map(ws =>
              h('div', { class: 'ws-card', key: ws.id }, [
                h('div', { class: 'ws-card-header' }, [
                  h(StatusLight, { status: ws.statusLight }),
                  ws.priority === '高' ? h('span', { class: 'ws-card-priority' }, '⭐') : null,
                  h('span', { class: 'ws-card-name' }, ws.name),
                  h('span', { class: 'ws-card-days' },
                    ws.lastUpdateTime ? `${getDaysSinceUpdate(ws.lastUpdateTime)}天前` : ''
                  ),
                ]),
                ws.currentStatus
                  ? h('div', { class: 'ws-card-status' }, ws.currentStatus)
                  : null,
                h('div', { class: 'ws-card-actions' }, [
                  h('button', { class: 'ws-action-btn primary', onClick: () => handleRestore(ws.id) }, '恢复'),
                  h('button', { class: 'ws-action-btn', onClick: () => confirmDelete(ws.id), style: { color: 'var(--color-red)' } }, '永久删除'),
                ]),
              ])
            )
          ),

      h(ConfirmDialog, {
        visible: showDeleteConfirm.value,
        message: '永久删除后无法恢复，确认删除吗？',
        confirmText: '永久删除',
        danger: true,
        onConfirm: doDelete,
        onCancel: () => { showDeleteConfirm.value = false },
      }),
    ])
  },
}
