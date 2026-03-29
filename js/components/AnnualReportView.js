import { h, computed } from 'vue'
import { state, ROLES } from '../store/state.js'
import { getDaysSinceUpdate } from '../services/status.js'
import { daysAgo } from '../utils/date.js'

export const AnnualReportView = {
  setup() {
    // Heatmap data: updates per day for the past year
    const heatmapData = computed(() => {
      const days = []
      for (let i = 364; i >= 0; i--) {
        const date = daysAgo(i)
        let count = 0
        state.workStreams.forEach(ws => {
          ws.history.forEach(h => {
            if (h.type === 'manual' && h.time.slice(0, 10) === date) count++
          })
        })
        days.push({ date, count })
      }
      return days
    })

    const maxCount = computed(() => Math.max(1, ...heatmapData.value.map(d => d.count)))

    const roleDistribution = computed(() => {
      const counts = {}
      Object.keys(ROLES).forEach(r => counts[r] = 0)
      state.workStreams.forEach(ws => {
        const manualUpdates = ws.history.filter(h => h.type === 'manual').length
        counts[ws.role] = (counts[ws.role] || 0) + manualUpdates
      })
      const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1
      return Object.entries(counts).map(([role, count]) => ({
        role,
        name: state.settings.roleNames[role] || ROLES[role].name,
        icon: ROLES[role].icon,
        count,
        percent: Math.round((count / total) * 100),
      }))
    })

    const topStagnation = computed(() => {
      return [...state.workStreams]
        .filter(ws => !ws.archived)
        .sort((a, b) => getDaysSinceUpdate(b.lastUpdateTime || '') - getDaysSinceUpdate(a.lastUpdateTime || ''))
        .slice(0, 5)
        .map(ws => ({
          name: ws.name,
          role: ws.role,
          days: ws.lastUpdateTime ? getDaysSinceUpdate(ws.lastUpdateTime) : '—',
        }))
    })

    function heatmapColor(count, max) {
      if (count === 0) return '#ebedf0'
      const intensity = count / max
      if (intensity <= 0.25) return '#9be9a8'
      if (intensity <= 0.5) return '#40c463'
      if (intensity <= 0.75) return '#30a14e'
      return '#216e39'
    }

    return () => h('div', null, [
      h('div', { class: 'page-header' }, [
        h('h1', { class: 'page-title' }, '📊 年度报告'),
      ]),

      // Heatmap
      h('div', { class: 'card', style: { marginBottom: 'var(--space-4)', overflowX: 'auto' } }, [
        h('h3', { style: { marginBottom: 'var(--space-4)' } }, '更新热力图'),
        h('svg', {
          width: 730,
          height: 100,
          viewBox: '0 0 730 100',
          style: { display: 'block' },
        }, heatmapData.value.map((day, idx) => {
          const col = Math.floor(idx / 7)
          const row = idx % 7
          return h('rect', {
            x: col * 14,
            y: row * 14,
            width: 12,
            height: 12,
            rx: 2,
            fill: heatmapColor(day.count, maxCount.value),
            key: idx,
          })
        })),
        h('div', { style: { display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginTop: 'var(--space-2)', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' } }, [
          h('span', null, '少'),
          h('div', { style: { width: '10px', height: '10px', borderRadius: '2px', background: '#ebedf0' } }),
          h('div', { style: { width: '10px', height: '10px', borderRadius: '2px', background: '#9be9a8' } }),
          h('div', { style: { width: '10px', height: '10px', borderRadius: '2px', background: '#40c463' } }),
          h('div', { style: { width: '10px', height: '10px', borderRadius: '2px', background: '#30a14e' } }),
          h('div', { style: { width: '10px', height: '10px', borderRadius: '2px', background: '#216e39' } }),
          h('span', null, '多'),
        ]),
      ]),

      // Role distribution
      h('div', { class: 'card', style: { marginBottom: 'var(--space-4)' } }, [
        h('h3', { style: { marginBottom: 'var(--space-4)' } }, '各角色关注度'),
        h('div', null,
          roleDistribution.value.map(item =>
            h('div', {
              key: item.role,
              style: {
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-3)',
                marginBottom: 'var(--space-3)',
              },
            }, [
              h('span', { style: { fontSize: 'var(--font-size-lg)' } }, item.icon),
              h('span', { style: { minWidth: '80px', fontSize: 'var(--font-size-sm)' } }, item.name),
              h('div', {
                style: {
                  flex: 1,
                  height: '8px',
                  background: 'var(--color-border-light)',
                  borderRadius: '4px',
                  overflow: 'hidden',
                },
              }, [
                h('div', {
                  style: {
                    height: '100%',
                    width: `${item.percent}%`,
                    background: 'var(--color-primary)',
                    borderRadius: '4px',
                    transition: 'width 0.3s ease',
                  },
                }),
              ]),
              h('span', { class: 'text-sm text-secondary', style: { minWidth: '40px', textAlign: 'right' } }, `${item.percent}%`),
            ])
          )
        ),
      ]),

      // Top stagnation
      h('div', { class: 'card', style: { marginBottom: 'var(--space-4)' } }, [
        h('h3', { style: { marginBottom: 'var(--space-4)' } }, '最长停滞 TOP 5'),
        topStagnation.value.length === 0
          ? h('p', { class: 'text-secondary text-sm' }, '暂无数据')
          : h('div', null,
              topStagnation.value.map((item, idx) =>
                h('div', {
                  key: idx,
                  style: {
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: 'var(--space-2) 0',
                    borderBottom: idx < 4 ? '1px solid var(--color-border-light)' : 'none',
                  },
                }, [
                  h('span', { style: { fontWeight: 'var(--font-weight-medium)' } },
                    `${idx + 1}. ${item.name}`
                  ),
                  h('span', {
                    style: {
                      color: item.days === '—' || item.days > 10 ? 'var(--color-red)' : 'var(--color-text-secondary)',
                      fontSize: 'var(--font-size-sm)',
                    },
                  }, item.days === '—' ? '从未更新' : `${item.days} 天`),
                ])
              )
            ),
      ]),

      // Export/Import section
      h('div', { class: 'card' }, [
        h('h3', { style: { marginBottom: 'var(--space-4)' } }, '数据备份'),
        h('div', { style: { display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' } }, [
          h('button', {
            class: 'btn btn-primary',
            onClick: () => {
              import('../services/export.js').then(m => m.exportData())
            },
          }, '导出 JSON'),
          h('label', { class: 'btn btn-secondary', style: { cursor: 'pointer' } }, [
            '导入 JSON',
            h('input', {
              type: 'file',
              accept: '.json',
              style: { display: 'none' },
              onChange: async (e) => {
                const file = e.target.files[0]
                if (!file) return
                const text = await file.text()
                if (confirm('导入将覆盖当前所有数据，确认继续？')) {
                  try {
                    const { importData } = await import('../services/export.js')
                    importData(text)
                  } catch (err) {
                    const { showToast } = await import('../store/actions.js')
                    showToast('导入失败：' + err.message, 'error')
                  }
                }
                e.target.value = ''
              },
            }),
          ]),
        ]),
      ]),
    ])
  },
}
