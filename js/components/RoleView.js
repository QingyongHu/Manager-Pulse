import { h, ref, computed } from 'vue'
import { state, ROLES } from '../store/state.js'
import { useWorkStreams } from '../composables/useWorkStreams.js'
import { StatusLight } from './StatusLight.js'
import { WorkStreamCard } from './WorkStreamCard.js'

export const RoleView = {
  props: {
    roleId: { type: String, required: true },
  },
  setup(props) {
    const { streamsByRole, roleStats, sortWorkStreams, filterWorkStreams } = useWorkStreams()
    const currentFilter = ref('all')
    const expandedId = ref(null)

    const role = computed(() => ROLES[props.roleId] || {})
    const roleName = computed(() => state.settings.roleNames[props.roleId] || role.value.name)
    const stats = computed(() => roleStats(props.roleId))
    const streams = computed(() => {
      const filtered = filterWorkStreams(streamsByRole(props.roleId).value, currentFilter.value)
      return sortWorkStreams(filtered)
    })

    function setFilter(f) {
      currentFilter.value = f
    }

    function toggleExpand(id) {
      expandedId.value = expandedId.value === id ? null : id
    }

    const filters = [
      { key: 'all', label: '全部' },
      { key: 'red', label: '🔴 停滞' },
      { key: 'yellow', label: '🟡 提醒' },
      { key: 'green', label: '🟢 健康' },
      { key: 'high', label: '⭐ 高优先' },
    ]

    return () => h('div', null, [
      h('div', { class: 'page-header' }, [
        h('h1', { class: 'page-title' }, [
          h('span', null, role.value.icon + ' '),
          h('span', null, roleName.value),
        ]),
      ]),

      // Role stats header
      h('div', { class: 'role-header' }, [
        h('span', { class: 'role-count' }, `共 ${stats.value.total} 条`),
        h('div', { class: 'role-status-counts' }, [
          stats.value.red > 0 ? h('span', { class: 'role-status-badge red' }, `🔴 ${stats.value.red}`) : null,
          stats.value.yellow > 0 ? h('span', { class: 'role-status-badge yellow' }, `🟡 ${stats.value.yellow}`) : null,
          stats.value.green > 0 ? h('span', { class: 'role-status-badge green' }, `🟢 ${stats.value.green}`) : null,
        ]),
      ]),

      // Filter bar
      h('div', { class: 'filter-bar' },
        filters.map(f =>
          h('button', {
            class: ['filter-pill', { active: currentFilter.value === f.key }],
            onClick: () => setFilter(f.key),
          }, f.label)
        )
      ),

      // Work stream list
      streams.value.length === 0
        ? h('div', { class: 'empty-state' }, [
            h('div', { class: 'empty-state-icon' }, '📋'),
            h('div', { class: 'empty-state-text' }, currentFilter.value === 'all' ? '该角色暂无工作线' : '没有符合条件的工作线'),
          ])
        : h('div', null,
            streams.value.map(ws =>
              h(WorkStreamCard, {
                key: ws.id,
                workStream: ws,
                expanded: expandedId.value === ws.id,
                onToggleExpand: () => toggleExpand(ws.id),
              })
            )
          ),
    ])
  },
}
