import { h, ref, reactive } from 'vue'
import { state, ROLES, DEFAULT_SETTINGS } from '../store/state.js'
import { updateSettings, showToast } from '../store/actions.js'
import { testConnection } from '../api/github.js'

export const SettingsView = {
  setup() {
    const form = reactive({
      github: { ...state.settings.github },
      ai: { ...state.settings.ai },
      thresholds: { ...state.settings.thresholds },
      roleNames: { ...state.settings.roleNames },
    })

    const testingGithub = ref(false)
    const testingAi = ref(false)

    async function testGithub() {
      testingGithub.value = true
      try {
        await testConnection(form.github)
        showToast('GitHub 连接成功', 'success')
      } catch (e) {
        showToast('连接失败：' + e.message, 'error')
      } finally {
        testingGithub.value = false
      }
    }

    async function testAi() {
      testingAi.value = true
      try {
        const resp = await fetch(`${form.ai.workerUrl.replace(/\/$/, '')}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${form.ai.apiKey}`,
          },
          body: JSON.stringify({
            model: form.ai.model || 'glm-4-flash',
            messages: [{ role: 'user', content: '你好' }],
          }),
        })
        if (resp.ok) {
          showToast('AI 连接成功', 'success')
        } else {
          const err = await resp.json().catch(() => ({}))
          showToast('连接失败：' + (err.error?.message || resp.status), 'error')
        }
      } catch (e) {
        showToast('连接失败：' + e.message, 'error')
      } finally {
        testingAi.value = false
      }
    }

    function save() {
      updateSettings({
        github: { ...form.github },
        ai: { ...form.ai },
        thresholds: { ...form.thresholds },
        roleNames: { ...form.roleNames },
      })
      showToast('设置已保存', 'success')
    }

    const roleEntries = Object.entries(ROLES)

    return () => h('div', null, [
      h('div', { class: 'page-header' }, [
        h('h1', { class: 'page-title' }, '⚙️ 设置'),
      ]),

      // GitHub config
      h('div', { class: 'card', style: { marginBottom: 'var(--space-4)' } }, [
        h('h3', { style: { marginBottom: 'var(--space-4)' } }, 'GitHub 数据同步'),
        h('div', { class: 'form-group' }, [
          h('label', { class: 'form-label' }, 'Personal Access Token'),
          h('input', {
            class: 'form-input',
            type: 'password',
            placeholder: 'ghp_xxxxxxxxxxxx',
            value: form.github.token,
            onInput: (e) => { form.github.token = e.target.value },
          }),
        ]),
        h('div', { class: 'form-group' }, [
          h('label', { class: 'form-label' }, 'Owner'),
          h('input', {
            class: 'form-input',
            type: 'text',
            placeholder: 'GitHub 用户名',
            value: form.github.owner,
            onInput: (e) => { form.github.owner = e.target.value },
          }),
        ]),
        h('div', { class: 'form-group' }, [
          h('label', { class: 'form-label' }, 'Repo'),
          h('input', {
            class: 'form-input',
            type: 'text',
            placeholder: '仓库名称',
            value: form.github.repo,
            onInput: (e) => { form.github.repo = e.target.value },
          }),
        ]),
        h('div', { class: 'form-group' }, [
          h('label', { class: 'form-label' }, 'Branch'),
          h('input', {
            class: 'form-input',
            type: 'text',
            placeholder: 'data',
            value: form.github.branch,
            onInput: (e) => { form.github.branch = e.target.value },
          }),
        ]),
        h('div', { class: 'form-group' }, [
          h('label', { class: 'form-label' }, 'File Path'),
          h('input', {
            class: 'form-input',
            type: 'text',
            placeholder: 'data.json',
            value: form.github.path,
            onInput: (e) => { form.github.path = e.target.value },
          }),
        ]),
        h('button', {
          class: 'btn btn-secondary',
          onClick: testGithub,
          disabled: testingGithub.value,
        }, testingGithub.value ? '测试中...' : '测试连接'),
      ]),

      // AI config
      h('div', { class: 'card', style: { marginBottom: 'var(--space-4)' } }, [
        h('h3', { style: { marginBottom: 'var(--space-4)' } }, 'AI 批量解析'),
        h('div', { class: 'form-group' }, [
          h('label', { class: 'form-label' }, 'API Key'),
          h('input', {
            class: 'form-input',
            type: 'password',
            placeholder: '你的智谱 API Key',
            value: form.ai.apiKey,
            onInput: (e) => { form.ai.apiKey = e.target.value },
          }),
        ]),
        h('div', { class: 'form-group' }, [
          h('label', { class: 'form-label' }, 'Worker URL (CORS 代理)'),
          h('input', {
            class: 'form-input',
            type: 'text',
            placeholder: 'https://your-worker.your-name.workers.dev',
            value: form.ai.workerUrl,
            onInput: (e) => { form.ai.workerUrl = e.target.value },
          }),
        ]),
        h('div', { class: 'form-group' }, [
          h('label', { class: 'form-label' }, '模型'),
          h('select', {
            class: 'form-select',
            value: form.ai.model,
            onChange: (e) => { form.ai.model = e.target.value },
          }, [
            h('option', { value: 'glm-5.1' }, 'GLM-5.1（最新）'),
            h('option', { value: 'glm-5' }, 'GLM-5'),
            h('option', { value: 'glm-4.7' }, 'GLM-4.7'),
            h('option', { value: 'glm-4.7-flash' }, 'GLM-4.7-Flash（免费）'),
            h('option', { value: 'glm-4.7-flashx' }, 'GLM-4.7-FlashX'),
            h('option', { value: 'glm-4-flash' }, 'GLM-4-Flash（免费）'),
            h('option', { value: 'glm-4-plus' }, 'GLM-4-Plus'),
          ]),
        ]),
        h('button', {
          class: 'btn btn-secondary',
          onClick: testAi,
          disabled: testingAi.value,
        }, testingAi.value ? '测试中...' : '测试连接'),
      ]),

      // Thresholds
      h('div', { class: 'card', style: { marginBottom: 'var(--space-4)' } }, [
        h('h3', { style: { marginBottom: 'var(--space-4)' } }, '状态灯阈值'),
        h('div', { class: 'form-group' }, [
          h('label', { class: 'form-label' }, `绿灯天数（当前：${form.thresholds.green} 天）`),
          h('input', {
            type: 'range',
            min: 1,
            max: 14,
            value: form.thresholds.green,
            onInput: (e) => { form.thresholds.green = parseInt(e.target.value) },
            style: { width: '100%' },
          }),
        ]),
        h('div', { class: 'form-group' }, [
          h('label', { class: 'form-label' }, `黄灯天数（当前：${form.thresholds.yellow} 天）`),
          h('input', {
            type: 'range',
            min: form.thresholds.green + 1,
            max: 30,
            value: form.thresholds.yellow,
            onInput: (e) => { form.thresholds.yellow = parseInt(e.target.value) },
            style: { width: '100%' },
          }),
        ]),
        h('p', { class: 'text-sm text-secondary' },
          `绿灯：${form.thresholds.green}天内有更新 | 黄灯：${form.thresholds.green}-${form.thresholds.yellow}天未更新 | 红灯：超过${form.thresholds.yellow}天`
        ),
      ]),

      // Role names
      h('div', { class: 'card', style: { marginBottom: 'var(--space-4)' } }, [
        h('h3', { style: { marginBottom: 'var(--space-4)' } }, '角色名称'),
        ...roleEntries.map(([id, role]) =>
          h('div', { class: 'form-group', key: id }, [
            h('label', { class: 'form-label' }, `${role.icon} ${role.name}`),
            h('input', {
              class: 'form-input',
              type: 'text',
              value: form.roleNames[id],
              onInput: (e) => { form.roleNames[id] = e.target.value },
            }),
          ])
        ),
      ]),

      // Save button
      h('div', { style: { textAlign: 'center', padding: 'var(--space-4) 0' } }, [
        h('button', { class: 'btn btn-primary btn-lg', onClick: save }, '保存设置'),
      ]),
    ])
  },
}
