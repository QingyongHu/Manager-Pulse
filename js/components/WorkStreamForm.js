import { h, ref, watch } from 'vue'
import { state, ROLES } from '../store/state.js'
import { addWorkStream, editWorkStream, showToast } from '../store/actions.js'

export const WorkStreamForm = {
  props: {
    visible: { type: Boolean, default: false },
    editMode: { type: Boolean, default: false },
    streamId: { type: String, default: '' },
  },
  emits: ['close'],
  setup(props, { emit }) {
    const name = ref('')
    const role = ref('R1')
    const priority = ref('中')
    const currentStatus = ref('')

    watch(() => props.visible, (v) => {
      if (v && props.editMode && props.streamId) {
        const ws = state.workStreams.find(s => s.id === props.streamId)
        if (ws) {
          name.value = ws.name
          role.value = ws.role
          priority.value = ws.priority
          currentStatus.value = ws.currentStatus
        }
      } else if (v && !props.editMode) {
        name.value = ''
        role.value = 'R1'
        priority.value = '中'
        currentStatus.value = ''
      }
    })

    function submit() {
      if (!name.value.trim()) {
        showToast('请输入工作线名称', 'warning')
        return
      }

      if (props.editMode) {
        editWorkStream(props.streamId, {
          name: name.value.trim(),
          role: role.value,
          priority: priority.value,
          currentStatus: currentStatus.value.trim(),
        })
        showToast('修改成功', 'success')
      } else {
        addWorkStream({
          name: name.value.trim(),
          role: role.value,
          priority: priority.value,
          currentStatus: currentStatus.value.trim(),
        })
        showToast('添加成功', 'success')
      }
      emit('close')
    }

    const roleOptions = Object.entries(ROLES).map(([id, r]) => ({
      value: id,
      label: r.icon + ' ' + (state.settings.roleNames[id] || r.name),
    }))

    return () => {
      if (!props.visible) return null

      return h('div', null, [
        h('div', {
          class: ['modal-overlay', { active: props.visible }],
          onClick: (e) => { if (e.target === e.currentTarget) emit('close') },
        }),
        h('div', { class: 'modal', style: { transform: props.visible ? 'scale(1)' : 'scale(0.95)' } }, [
          h('div', { class: 'modal-header' }, [
            h('h3', { class: 'modal-title' }, props.editMode ? '编辑工作线' : '新增工作线'),
            h('button', { class: 'modal-close', onClick: () => emit('close') }, '✕'),
          ]),
          h('div', { class: 'modal-body' }, [
            h('div', { class: 'form-group' }, [
              h('label', { class: 'form-label' }, '名称'),
              h('input', {
                class: 'form-input',
                type: 'text',
                placeholder: '如：张三（博士）',
                value: name.value,
                onInput: (e) => { name.value = e.target.value },
              }),
            ]),
            h('div', { class: 'form-group' }, [
              h('label', { class: 'form-label' }, '角色'),
              h('select', {
                class: 'form-select',
                value: role.value,
                onChange: (e) => { role.value = e.target.value },
                disabled: false,
              }, roleOptions.map(o =>
                h('option', { value: o.value, key: o.value }, o.label)
              )),
            ]),
            h('div', { class: 'form-group' }, [
              h('label', { class: 'form-label' }, '优先级'),
              h('select', {
                class: 'form-select',
                value: priority.value,
                onChange: (e) => { priority.value = e.target.value },
              }, [
                h('option', { value: '高' }, '⭐ 高'),
                h('option', { value: '中' }, '中'),
                h('option', { value: '低' }, '低'),
              ]),
            ]),
            h('div', { class: 'form-group' }, [
              h('label', { class: 'form-label' }, props.editMode ? '当前状态' : '初始状态（选填）'),
              h('textarea', {
                class: 'form-textarea',
                placeholder: '一句话描述当前进展...',
                value: currentStatus.value,
                onInput: (e) => { currentStatus.value = e.target.value },
                rows: 2,
              }),
            ]),
          ]),
          h('div', { class: 'modal-footer' }, [
            h('button', { class: 'btn btn-secondary', onClick: () => emit('close') }, '取消'),
            h('button', { class: 'btn btn-primary', onClick: submit }, props.editMode ? '保存' : '添加'),
          ]),
        ]),
      ])
    }
  },
}
