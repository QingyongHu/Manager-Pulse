import { h } from 'vue'
import { formatRelativeTime } from '../utils/date.js'

export const HistoryTimeline = {
  props: {
    history: { type: Array, required: true },
  },
  setup(props) {
    return () => {
      if (!props.history || props.history.length === 0) return null

      return h('div', { class: 'timeline' },
        props.history.map((item, idx) =>
          h('div', { class: 'timeline-item', key: item.time + idx }, [
            h('span', { class: ['timeline-dot', item.type === 'system' ? 'system' : ''] }),
            h('span', { class: 'timeline-date' }, item.time.slice(0, 10)),
            h('span', {
              class: ['timeline-content', item.type === 'system' ? 'timeline-system' : ''],
            }, (item.type === 'system' ? '⚠ ' : '') + item.content),
          ])
        )
      )
    }
  },
}
