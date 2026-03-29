import { h, ref, computed } from 'vue'
import { state, ROLES } from '../store/state.js'
import { batchUpdate, showToast } from '../store/actions.js'
import { parseWorkUpdates } from '../api/zhipu.js'
import { matchAllAiResults } from '../utils/fuzzyMatch.js'
import { StatusLight } from './StatusLight.js'
import { getDaysSinceUpdate } from '../services/status.js'

export const BatchUpdatePanel = {
  props: {
    visible: { type: Boolean, default: false },
  },
  emits: ['close'],
  setup(props, { emit }) {
    const step = ref('input') // input | parsing | preview
    const rawInput = ref('')
    const parsedResults = ref([])
    const parseError = ref('')

    const unmatchedRedStreams = computed(() => {
      if (step.value !== 'preview') return []
      const matchedIds = new Set(
        parsedResults.value.filter(r => r.matchedStream && r.included).map(r => r.matchedStream.id)
      )
      return state.workStreams.filter(ws =>
        !ws.archived && ws.statusLight === 'red' && !matchedIds.has(ws.id)
      )
    })

    async function startParsing() {
      if (!rawInput.value.trim()) {
        showToast('请输入内容', 'warning')
        return
      }

      if (!state.settings.ai.apiKey) {
        showToast('请先在设置中配置 AI API Key', 'warning')
        return
      }

      step.value = 'parsing'
      parseError.value = ''

      try {
        // Build rich context with role info for better AI matching
        const activeStreams = state.workStreams.filter(ws => !ws.archived)
        const streamContext = activeStreams.map(ws => {
          const role = ROLES[ws.role]
          return {
            id: ws.id,
            name: ws.name,
            role: ws.role,
            roleName: state.settings.roleNames[ws.role] || (role ? role.name : ws.role),
            roleIcon: role ? role.icon : '',
          }
        })
        const aiResults = await parseWorkUpdates(rawInput.value, streamContext, state.settings.ai)
        parsedResults.value = matchAllAiResults(aiResults, activeStreams)

        if (parsedResults.value.length === 0) {
          parseError.value = '未能识别任何工作线更新，请修改描述后重试'
          step.value = 'input'
          return
        }

        step.value = 'preview'
      } catch (e) {
        parseError.value = e.message || '解析失败，请重试'
        step.value = 'input'
        showToast('AI 解析失败：' + parseError.value, 'error')
      }
    }

    function toggleItem(idx) {
      parsedResults.value[idx].included = !parsedResults.value[idx].included
    }

    function editItem(idx, field, value) {
      parsedResults.value[idx][field] = value
    }

    function changeMatch(idx, streamId) {
      const ws = state.workStreams.find(s => s.id === streamId)
      if (ws) {
        parsedResults.value[idx].matchedStream = ws
      }
    }

    async function confirmAll() {
      const updates = parsedResults.value
        .filter(r => r.matchedStream && r.included)
        .map(r => ({
          streamId: r.matchedStream.id,
          content: r.status,
        }))

      if (updates.length === 0) {
        showToast('没有可确认的更新', 'warning')
        return
      }

      batchUpdate(updates)
      showToast(`已更新 ${updates.length} 条工作线`, 'success')
      reset()
      emit('close')
    }

    function reset() {
      step.value = 'input'
      rawInput.value = ''
      parsedResults.value = []
      parseError.value = ''
    }

    function close() {
      reset()
      emit('close')
    }

    return () => {
      if (!props.visible) return null

      return h('div', { class: ['batch-panel', { active: props.visible }] }, [
        // Header
        h('div', { class: 'batch-panel-header' }, [
          h('h3', null, '📝 批量更新'),
          h('button', { class: 'modal-close', onClick: close }, '✕'),
        ]),

        // Body
        h('div', { class: 'batch-panel-body' }, [
          // Step: Input
          step.value === 'input' ? h('div', null, [
            h('p', { style: { color: 'var(--color-text-secondary)', marginBottom: 'var(--space-4)', fontSize: 'var(--font-size-sm)' } },
              '说说今天的进展，比如：'
            ),
            h('div', {
              style: {
                background: 'var(--color-hover)',
                padding: 'var(--space-3) var(--space-4)',
                borderRadius: 'var(--radius-md)',
                fontSize: 'var(--font-size-sm)',
                color: 'var(--color-text-tertiary)',
                marginBottom: 'var(--space-4)',
                lineHeight: 'var(--line-height-relaxed)',
              },
            }, '孙启尧今天发了初稿给我。218A项目的经费审批下来了。装修这周没动。'),
            h('textarea', {
              class: 'form-textarea',
              placeholder: '输入今天的进展...',
              value: rawInput.value,
              onInput: (e) => { rawInput.value = e.target.value },
              rows: 6,
              style: { fontSize: '16px', minHeight: '150px' },
            }),
            parseError.value ? h('p', { style: { color: 'var(--color-red)', fontSize: 'var(--font-size-sm)', marginTop: 'var(--space-2)' } }, parseError.value) : null,
          ]) : null,

          // Step: Parsing
          step.value === 'parsing' ? h('div', {
            style: {
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 'var(--space-12) 0',
            },
          }, [
            h('div', { class: 'spinner', style: { width: '40px', height: '40px', borderWidth: '3px' } }),
            h('p', { style: { marginTop: 'var(--space-4)', color: 'var(--color-text-secondary)' } }, 'AI 正在分析...'),
          ]) : null,

          // Step: Preview
          step.value === 'preview' ? h('div', null, [
            h('p', { style: { fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-4)' } },
              `AI 识别到 ${parsedResults.value.length} 条工作线更新：`
            ),
            // Preview items
            h('div', null,
              parsedResults.value.map((item, idx) =>
                h('div', {
                  key: idx,
                  class: 'card',
                  style: {
                    marginBottom: 'var(--space-3)',
                    opacity: item.included ? '1' : '0.5',
                  },
                }, [
                  h('div', { style: { display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' } }, [
                    h('input', {
                      type: 'checkbox',
                      checked: item.included,
                      onChange: () => toggleItem(idx),
                      style: { width: '18px', height: '18px' },
                    }),
                    item.matchedStream
                      ? h('span', { class: ['preview-match', item.confidence] },
                          item.confidence === 'high' ? '✅' : item.confidence === 'medium' ? '⚠️' : '❓'
                        )
                      : h('span', { class: 'preview-match low' }, '❓ 未匹配'),
                    item.matchedStream ? h('span', { class: 'font-medium' }, item.matchedStream.name) : h('span', { class: 'text-tertiary' }, item.stream_name),
                  ]),
                  h('div', { style: { paddingLeft: '26px' } }, [
                    h('input', {
                      class: 'form-input',
                      type: 'text',
                      value: item.status,
                      onInput: (e) => editItem(idx, 'status', e.target.value),
                      style: { fontSize: '16px', padding: 'var(--space-2) var(--space-3)' },
                    }),
                  ]),
                ])
              )
            ),

            // Unmatched red streams warning
            unmatchedRedStreams.value.length > 0 ? h('div', {
              style: {
                marginTop: 'var(--space-4)',
                padding: 'var(--space-3) var(--space-4)',
                background: 'var(--color-red-bg)',
                borderRadius: 'var(--radius-md)',
                fontSize: 'var(--font-size-sm)',
              },
            }, [
              h('p', { style: { color: 'var(--color-red)', fontWeight: 'var(--font-weight-medium)', marginBottom: 'var(--space-2)' } },
                '以下工作线仍处于停滞状态：'
              ),
              ...unmatchedRedStreams.value.map(ws =>
                h('div', { style: { display: 'flex', alignItems: 'center', gap: 'var(--space-2)', padding: 'var(--space-1) 0' } }, [
                  h(StatusLight, { status: 'red' }),
                  h('span', null, ws.name),
                  h('span', { class: 'text-tertiary text-xs' }, `${getDaysSinceUpdate(ws.lastUpdateTime)}天未更新`),
                ])
              ),
            ]) : null,
          ]) : null,
        ]),

        // Footer
        h('div', { class: 'batch-panel-footer' }, [
          step.value === 'input'
            ? h('div', { style: { display: 'flex', gap: 'var(--space-3)', width: '100%' } }, [
                h('button', { class: 'btn btn-secondary', onClick: close, style: { flex: 1 } }, '取消'),
                h('button', {
                  class: 'btn btn-primary',
                  onClick: startParsing,
                  disabled: !rawInput.value.trim(),
                  style: { flex: 2 },
                }, '解析'),
              ])
            : null,
          step.value === 'preview'
            ? h('div', { style: { display: 'flex', gap: 'var(--space-3)', width: '100%' } }, [
                h('button', { class: 'btn btn-secondary', onClick: () => { step.value = 'input' }, style: { flex: 1 } }, '返回修改'),
                h('button', { class: 'btn btn-primary', onClick: confirmAll, style: { flex: 2 } },
                  `确认更新 (${parsedResults.value.filter(r => r.included && r.matchedStream).length}条)`
                ),
              ])
            : null,
        ]),
      ])
    }
  },
}
