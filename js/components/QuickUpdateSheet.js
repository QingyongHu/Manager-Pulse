import { h, ref, nextTick } from 'vue'
import { state } from '../store/state.js'
import { quickUpdate, showToast } from '../store/actions.js'

export const QuickUpdateSheet = {
  props: {
    visible: { type: Boolean, default: false },
    streamId: { type: String, default: '' },
    streamName: { type: String, default: '' },
  },
  emits: ['close'],
  setup(props, { emit }) {
    const inputText = ref('')

    function submit() {
      const text = inputText.value.trim()
      if (!text) return
      quickUpdate(props.streamId, text)
      showToast('更新成功', 'success')
      inputText.value = ''
      emit('close')
    }

    function handleKeydown(e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        submit()
      }
    }

    return () => {
      if (!props.visible) return null

      return h('div', null, [
        h('div', {
          class: ['bottom-sheet-overlay', { active: props.visible }],
          onClick: (e) => { if (e.target === e.currentTarget) emit('close') },
        }),
        h('div', { class: ['bottom-sheet', { active: props.visible }] }, [
          h('div', { class: 'bottom-sheet-handle' }),
          h('div', { class: 'bottom-sheet-content' }, [
            h('div', { class: 'bottom-sheet-title' }, `更新：${props.streamName}`),
            h('div', { class: 'form-group' }, [
              h('input', {
                class: 'form-input',
                type: 'text',
                placeholder: '一句话说说进展...',
                value: inputText.value,
                onInput: (e) => { inputText.value = e.target.value },
                onKeydown: handleKeydown,
                style: { fontSize: '16px' },
                autofocus: true,
              }),
            ]),
            h('div', { style: { display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' } }, [
              h('button', { class: 'btn btn-secondary', onClick: () => emit('close') }, '取消'),
              h('button', { class: 'btn btn-primary', onClick: submit, disabled: !inputText.value.trim() }, '确认'),
            ]),
          ]),
        ]),
      ])
    }
  },
}
