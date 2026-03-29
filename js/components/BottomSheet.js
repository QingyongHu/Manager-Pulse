import { h, ref, onMounted, onUnmounted } from 'vue'

export const BottomSheet = {
  props: {
    visible: { type: Boolean, default: false },
    title: { type: String, default: '' },
  },
  emits: ['close'],
  setup(props, { emit, slots }) {
    function close() {
      emit('close')
    }

    function onOverlayClick(e) {
      if (e.target === e.currentTarget) close()
    }

    return () => {
      if (!props.visible) return null

      return h('div', null, [
        h('div', {
          class: ['bottom-sheet-overlay', { active: props.visible }],
          onClick: onOverlayClick,
        }),
        h('div', { class: ['bottom-sheet', { active: props.visible }] }, [
          h('div', { class: 'bottom-sheet-handle' }),
          props.title ? h('div', { class: 'bottom-sheet-title' }, props.title) : null,
          h('div', { class: 'bottom-sheet-content' }, slots.default?.()),
        ]),
      ])
    }
  },
}
