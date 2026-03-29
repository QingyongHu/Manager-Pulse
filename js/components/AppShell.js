import { h, computed, ref, onMounted, onUnmounted, resolveComponent } from 'vue'
import { useRouter, useRoute, RouterView } from 'vue-router'
import { state, ROLES } from '../store/state.js'
import { useWorkStreams } from '../composables/useWorkStreams.js'
import { archiveWorkStream, showToast } from '../store/actions.js'
import { Toast } from './Toast.js'
import { QuickUpdateSheet } from './QuickUpdateSheet.js'
import { WorkStreamForm } from './WorkStreamForm.js'
import { ConfirmDialog } from './ConfirmDialog.js'
import { BatchUpdatePanel } from './BatchUpdatePanel.js'

export const AppShell = {
  setup() {
    const router = useRouter()
    const route = useRoute()
    const { statsCounts } = useWorkStreams()

    // Global dialog state
    const quickUpdateVisible = ref(false)
    const quickUpdateStreamId = ref('')
    const quickUpdateStreamName = ref('')
    const editFormVisible = ref(false)
    const editFormStreamId = ref('')
    const editFormMode = ref(false)
    const archiveConfirmVisible = ref(false)
    const archiveTargetId = ref('')
    const batchUpdateVisible = ref(false)

    function onOpenQuickUpdate(e) {
      const id = e.detail
      const ws = state.workStreams.find(s => s.id === id)
      if (!ws) return
      quickUpdateStreamId.value = id
      quickUpdateStreamName.value = ws.name
      quickUpdateVisible.value = true
    }

    function onOpenEditForm(e) {
      const id = e.detail
      editFormStreamId.value = id
      editFormMode.value = true
      editFormVisible.value = true
    }

    function onOpenNewForm() {
      editFormStreamId.value = ''
      editFormMode.value = false
      editFormVisible.value = true
    }

    function onArchiveStream(e) {
      archiveTargetId.value = e.detail
      archiveConfirmVisible.value = true
    }

    function onOpenBatchUpdate() {
      batchUpdateVisible.value = true
    }

    function doArchive() {
      archiveWorkStream(archiveTargetId.value)
      showToast('已归档', 'success')
      archiveConfirmVisible.value = false
    }

    onMounted(() => {
      window.addEventListener('open-quick-update', onOpenQuickUpdate)
      window.addEventListener('open-edit-form', onOpenEditForm)
      window.addEventListener('open-new-form', onOpenNewForm)
      window.addEventListener('archive-stream', onArchiveStream)
      window.addEventListener('open-batch-update', onOpenBatchUpdate)
    })

    onUnmounted(() => {
      window.removeEventListener('open-quick-update', onOpenQuickUpdate)
      window.removeEventListener('open-edit-form', onOpenEditForm)
      window.removeEventListener('open-new-form', onOpenNewForm)
      window.removeEventListener('archive-stream', onArchiveStream)
      window.removeEventListener('open-batch-update', onOpenBatchUpdate)
    })

    const navItems = computed(() => [
      { path: '/', label: '首页', icon: '🏠', name: 'home' },
      { path: '/role/R1', label: state.settings.roleNames.R1 || ROLES.R1.name, icon: ROLES.R1.icon, name: 'role-r1' },
      { path: '/role/R2', label: state.settings.roleNames.R2 || ROLES.R2.name, icon: ROLES.R2.icon, name: 'role-r2' },
      { path: '/role/R3', label: state.settings.roleNames.R3 || ROLES.R3.name, icon: ROLES.R3.icon, name: 'role-r3' },
      { path: '/role/R4', label: state.settings.roleNames.R4 || ROLES.R4.name, icon: ROLES.R4.icon, name: 'role-r4' },
    ])

    const bottomTabs = computed(() => navItems.value.slice(0, 5))

    const moreItems = [
      { path: '/archive', label: '归档', icon: '📦', name: 'archive' },
      { path: '/report', label: '年度报告', icon: '📊', name: 'report' },
      { path: '/settings', label: '设置', icon: '⚙️', name: 'settings' },
    ]

    function navigate(path) { router.push(path) }

    function isActive(path) {
      if (path === '/') return route.path === '/'
      return route.path.startsWith(path)
    }

    function syncDotClass() {
      if (!state.isOnline) return 'offline'
      const s = state.syncMeta.syncStatus
      if (s === 'syncing') return 'syncing'
      if (s === 'error') return 'error'
      return 'synced'
    }

    function syncLabel() {
      if (!state.isOnline) return '离线模式'
      const s = state.syncMeta.syncStatus
      if (s === 'syncing') return '同步中...'
      if (s === 'error') return '同步失败'
      if (state.syncMeta.lastSyncTime) return '已同步'
      return '未同步'
    }

    return () => h('div', { class: 'app-shell' }, [
      // Offline banner
      !state.isOnline ? h('div', { class: 'offline-banner' }, '离线模式 — 数据保存在本地，联网后自动同步') : null,

      // Desktop sidebar
      !state.isMobile ? h('aside', { class: 'sidebar' }, [
        h('div', { class: 'sidebar-header' }, [
          h('div', { class: 'sidebar-logo' }, '管理脉搏'),
          h('div', { class: 'sidebar-subtitle' }, 'Manager Pulse'),
        ]),
        h('nav', { class: 'sidebar-nav' }, [
          h('div', { class: 'sidebar-section' },
            navItems.value.map(item =>
              h('button', {
                class: ['nav-item', { active: isActive(item.path) }],
                onClick: () => navigate(item.path),
              }, [
                h('span', { class: 'nav-item-icon' }, item.icon),
                h('span', null, item.label),
                item.name === 'home' && statsCounts.value.red > 0
                  ? h('span', { class: 'nav-item-badge' }, statsCounts.value.red)
                  : null,
              ])
            )
          ),
          h('div', { class: 'sidebar-divider' }),
          h('div', { class: 'sidebar-section' },
            moreItems.map(item =>
              h('button', {
                class: ['nav-item', { active: isActive(item.path) }],
                onClick: () => navigate(item.path),
              }, [
                h('span', { class: 'nav-item-icon' }, item.icon),
                h('span', null, item.label),
              ])
            )
          ),
        ]),
        h('div', { class: 'sidebar-footer' }, [
          h('button', {
            class: 'sidebar-batch-btn',
            onClick: () => batchUpdateVisible.value = true,
          }, '📝 批量更新'),
          h('div', { class: 'sync-status' }, [
            h('span', { class: ['sync-dot', syncDotClass()] }),
            h('span', null, syncLabel()),
          ]),
        ]),
      ]) : null,

      // Main content with router-view
      h('main', { class: 'main-content' }, [
        h('div', { class: 'page-content' }, [
          h(RouterView),
        ]),
      ]),

      // Mobile bottom tab bar
      state.isMobile ? h('nav', { class: 'tab-bar' },
        bottomTabs.value.map(tab =>
          h('button', {
            class: ['tab-item', { active: isActive(tab.path) }],
            onClick: () => navigate(tab.path),
          }, [
            h('span', { class: 'tab-item-icon' }, tab.icon),
            h('span', { class: 'tab-item-label' }, tab.label.length > 4 ? tab.label.slice(0, 4) : tab.label),
          ])
        )
      ) : null,

      // Mobile FAB
      state.isMobile ? h('button', {
        class: 'fab-batch-update',
        onClick: () => batchUpdateVisible.value = true,
        'aria-label': '批量更新',
      }, '📝') : null,

      // Global dialogs
      h(QuickUpdateSheet, {
        visible: quickUpdateVisible.value,
        streamId: quickUpdateStreamId.value,
        streamName: quickUpdateStreamName.value,
        onClose: () => { quickUpdateVisible.value = false },
      }),

      h(WorkStreamForm, {
        visible: editFormVisible.value,
        editMode: editFormMode.value,
        streamId: editFormStreamId.value,
        onClose: () => { editFormVisible.value = false },
      }),

      h(ConfirmDialog, {
        visible: archiveConfirmVisible.value,
        message: '确认归档此工作线？可在归档区恢复。',
        confirmText: '归档',
        onConfirm: doArchive,
        onCancel: () => { archiveConfirmVisible.value = false },
      }),

      h(BatchUpdatePanel, {
        visible: batchUpdateVisible.value,
        onClose: () => { batchUpdateVisible.value = false },
      }),

      // Toast
      h(Toast),
    ])
  },
}
