import { h } from 'vue'
import { useRouter } from 'vue-router'
import { state, ROLES } from '../store/state.js'
import { useWorkStreams } from '../composables/useWorkStreams.js'
import { StatusLight } from './StatusLight.js'
import { formatRelativeTime, daysBetween } from '../utils/date.js'
import { getDaysSinceUpdate } from '../services/status.js'

export const HomeView = {
  setup() {
    const router = useRouter()
    const { statsCounts, mustPushToday, recentUpdates } = useWorkStreams()

    function goToRole(roleId) {
      router.push(`/role/${roleId}`)
    }

    function goToStream(streamId) {
      // Navigate to the stream's role view; the RoleView will handle highlighting
      const ws = state.workStreams.find(s => s.id === streamId)
      if (ws) router.push(`/role/${ws.role}`)
    }

    return () => h('div', null, [
      // Page header
      h('div', { class: 'page-header' }, [
        h('h1', { class: 'page-title' }, '管理脉搏'),
        h('p', { class: 'page-description' }, '每天 1 分钟，确认哪些线在动、哪些线停了'),
      ]),

      // Stats grid
      h('div', { class: 'stats-grid' }, [
        h('div', {
          class: 'stats-card',
          onClick: () => goToRole('R1'),
          style: { borderColor: 'var(--color-red)' },
        }, [
          h('div', { class: 'stats-card-icon' }, '🔴'),
          h('div', null, [
            h('div', { class: 'stats-card-number', style: { color: 'var(--color-red)' } }, statsCounts.value.red),
            h('div', { class: 'stats-card-label' }, '停滞'),
          ]),
        ]),
        h('div', {
          class: 'stats-card',
          style: { borderColor: 'var(--color-yellow)' },
        }, [
          h('div', { class: 'stats-card-icon' }, '🟡'),
          h('div', null, [
            h('div', { class: 'stats-card-number', style: { color: 'var(--color-yellow)' } }, statsCounts.value.yellow),
            h('div', { class: 'stats-card-label' }, '提醒'),
          ]),
        ]),
        h('div', {
          class: 'stats-card',
          style: { borderColor: 'var(--color-green)' },
        }, [
          h('div', { class: 'stats-card-icon' }, '🟢'),
          h('div', null, [
            h('div', { class: 'stats-card-number', style: { color: 'var(--color-green)' } }, statsCounts.value.green),
            h('div', { class: 'stats-card-label' }, '健康'),
          ]),
        ]),
      ]),

      // Today's must-push section
      h('div', { style: { marginTop: 'var(--space-6)' } }, [
        h('div', { class: 'section-header' }, [
          h('h2', { class: 'section-title' }, '今日必推'),
        ]),
        mustPushToday.value.length === 0
          ? h('div', { class: 'empty-state', style: { padding: 'var(--space-8) var(--space-4)' } }, [
              h('div', { class: 'empty-state-icon' }, '✓'),
              h('div', { class: 'empty-state-text' }, '今天没有需要主动推的事项'),
            ])
          : h('div', null,
              mustPushToday.value.map(ws =>
                h('div', {
                  class: 'ws-card',
                  key: ws.id,
                  onClick: () => goToStream(ws.id),
                  style: { cursor: 'pointer' },
                }, [
                  h('div', { class: 'ws-card-header' }, [
                    h(StatusLight, { status: ws.statusLight }),
                    ws.priority === '高' ? h('span', { class: 'ws-card-priority' }, '⭐') : null,
                    h('span', { class: 'ws-card-name' }, ws.name),
                    h('span', {
                      class: 'ws-card-days',
                      style: { color: ws.statusLight === 'red' ? 'var(--color-red)' : 'var(--color-yellow)' },
                    }, ws.lastUpdateTime ? `${getDaysSinceUpdate(ws.lastUpdateTime)}天前` : '未填写'),
                  ]),
                  ws.currentStatus
                    ? h('div', { class: 'ws-card-status' }, ws.currentStatus.length > 30 ? ws.currentStatus.slice(0, 30) + '...' : ws.currentStatus)
                    : null,
                ])
              )
            ),
      ]),

      // Recent updates feed
      recentUpdates.value.length > 0 ? h('div', { style: { marginTop: 'var(--space-8)' } }, [
        h('div', { class: 'section-header' }, [
          h('h2', { class: 'section-title' }, '最近更新'),
        ]),
        h('div', { class: 'card', style: { padding: 'var(--space-2) var(--space-4)' } },
          recentUpdates.value.map(item =>
            h('div', { class: 'feed-item', key: item.time + item.streamName }, [
              h('span', { class: 'feed-role-tag' }, state.settings.roleNames[item.role] || item.role),
              h('div', { class: 'feed-body' }, [
                h('div', { class: 'feed-name' }, item.streamName),
                h('div', { class: 'feed-content' }, item.content.length > 40 ? item.content.slice(0, 40) + '...' : item.content),
              ]),
              h('span', { class: 'feed-time' }, formatRelativeTime(item.time)),
            ])
          )
        ),
      ]) : null,
    ])
  },
}
