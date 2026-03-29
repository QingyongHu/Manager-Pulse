import { h } from 'vue'
import { getDaysSinceUpdate } from '../services/status.js'
import { StatusLight } from './StatusLight.js'
import { HistoryTimeline } from './HistoryTimeline.js'

export const WorkStreamCard = {
  props: {
    workStream: { type: Object, required: true },
    expanded: { type: Boolean, default: false },
  },
  emits: ['toggle-expand', 'quick-update', 'edit', 'archive'],
  setup(props, { emit }) {
    function handleUpdate() {
      window.dispatchEvent(new CustomEvent('open-quick-update', { detail: props.workStream.id }))
    }

    function handleEdit() {
      window.dispatchEvent(new CustomEvent('open-edit-form', { detail: props.workStream.id }))
    }

    function handleArchive() {
      window.dispatchEvent(new CustomEvent('archive-stream', { detail: props.workStream.id }))
    }

    return () => {
      const ws = props.workStream
      const days = getDaysSinceUpdate(ws.lastUpdateTime)

      return h('div', { class: 'ws-card' }, [
        h('div', {
          class: 'ws-card-header',
          onClick: () => emit('toggle-expand'),
        }, [
          h(StatusLight, { status: ws.statusLight }),
          ws.priority === '高' ? h('span', { class: 'ws-card-priority' }, '⭐') : null,
          h('span', { class: 'ws-card-name' }, ws.name),
          h('div', { class: 'ws-card-meta' }, [
            h('span', {
              class: 'ws-card-days',
              style: {
                color: ws.statusLight === 'red' ? 'var(--color-red)'
                  : ws.statusLight === 'yellow' ? 'var(--color-yellow)'
                  : 'var(--color-text-tertiary)',
              },
            }, ws.lastUpdateTime ? `${days}天前` : '未填写'),
          ]),
        ]),

        ws.currentStatus
          ? h('div', { class: 'ws-card-status' },
              ws.currentStatus.length > 50 ? ws.currentStatus.slice(0, 50) + '...' : ws.currentStatus
            )
          : null,

        h('div', { class: 'ws-card-actions' }, [
          h('button', { class: 'ws-action-btn primary', onClick: (e) => { e.stopPropagation(); handleUpdate() } }, '更新'),
          h('button', { class: 'ws-action-btn', onClick: (e) => { e.stopPropagation(); handleEdit() } }, '编辑'),
          h('button', { class: 'ws-action-btn', onClick: (e) => { e.stopPropagation(); handleArchive() } }, '归档'),
        ]),

        props.expanded && ws.history.length > 0
          ? h(HistoryTimeline, { history: ws.history })
          : null,
      ])
    }
  },
}
