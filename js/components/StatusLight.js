import { h } from 'vue'

export const StatusLight = {
  props: {
    status: { type: String, required: true },
    size: { type: String, default: '' },
  },
  setup(props) {
    return () => h('span', {
      class: ['status-light', props.status, props.size ? `status-light-${props.size}` : ''],
      'aria-label': props.status === 'green' ? '健康' : props.status === 'yellow' ? '提醒' : '停滞',
    })
  },
}
