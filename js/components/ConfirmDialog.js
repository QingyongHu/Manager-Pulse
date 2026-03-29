import { h } from 'vue'

export const ConfirmDialog = {
  props: {
    visible: { type: Boolean, default: false },
    title: { type: String, default: '确认' },
    message: { type: String, default: '' },
    confirmText: { type: String, default: '确认' },
    danger: { type: Boolean, default: false },
  },
  emits: ['confirm', 'cancel'],
  setup(props, { emit }) {
    return () => {
      if (!props.visible) return null

      return h('div', null, [
        h('div', {
          class: ['modal-overlay', { active: props.visible }],
          onClick: (e) => { if (e.target === e.currentTarget) emit('cancel') },
        }),
        h('div', { class: 'modal' }, [
          h('div', { class: 'confirm-dialog' }, [
            h('div', { class: 'confirm-dialog-icon' }, props.danger ? '⚠️' : '❓'),
            h('div', { class: 'confirm-dialog-message' }, props.message),
            h('div', { class: 'confirm-dialog-actions' }, [
              h('button', { class: 'btn btn-secondary', onClick: () => emit('cancel') }, '取消'),
              h('button', {
                class: props.danger ? 'btn btn-danger' : 'btn btn-primary',
                onClick: () => emit('confirm'),
              }, props.confirmText),
            ]),
          ]),
        ]),
      ])
    }
  },
}
