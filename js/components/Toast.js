import { h } from 'vue'
import { state } from '../store/state.js'

export const Toast = {
  setup() {
    return () => {
      if (state.toasts.length === 0) return null
      return h('div', { class: 'toast-container' },
        state.toasts.map(toast =>
          h('div', { class: ['toast', toast.type], key: toast.id }, toast.message)
        )
      )
    }
  },
}
