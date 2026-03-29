const TOOL_DEFINITION = {
  type: 'function',
  function: {
    name: 'parse_work_updates',
    description: '从用户的自由文本中提取工作流更新信息。识别每个工作流的名称、当前状态。',
    parameters: {
      type: 'object',
      properties: {
        updates: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              stream_name: {
                type: 'string',
                description: '工作线名称（尽量匹配已有名称）',
              },
              status: {
                type: 'string',
                description: '当前状态简述（1-2句话）',
              },
            },
            required: ['stream_name', 'status'],
          },
          description: '解析出的工作线更新列表',
        },
      },
      required: ['updates'],
    },
  },
}

export async function parseWorkUpdates(rawText, workStreamContext, aiConfig) {
  const { apiKey, model, workerUrl } = aiConfig

  if (!apiKey) throw new Error('未配置 AI API Key')
  if (!workerUrl) throw new Error('未配置 AI Worker URL')

  // Build role-grouped context for better fuzzy matching
  let contextList = ''
  if (Array.isArray(workStreamContext) && workStreamContext.length > 0 && typeof workStreamContext[0] === 'object') {
    // Rich context with role info
    const byRole = {}
    for (const ws of workStreamContext) {
      const roleLabel = `${ws.roleIcon} ${ws.roleName}`
      if (!byRole[roleLabel]) byRole[roleLabel] = []
      byRole[roleLabel].push(ws.name)
    }
    contextList = Object.entries(byRole)
      .map(([role, names]) => `${role}:\n${names.map(n => `  - ${n}`).join('\n')}`)
      .join('\n')
  } else {
    // Fallback: plain name list
    const names = Array.isArray(workStreamContext) ? workStreamContext : []
    contextList = names.map((name, i) => `${i + 1}. ${name}`).join('\n')
  }

  const systemPrompt = `你是一个工作线进度更新解析器。用户会输入一段话描述今天的工作进展，你需要识别出每条被提及的工作线，并提取对应的状态更新。

当前系统中的工作线按角色分组如下：
${contextList}

匹配规则（非常重要）：
1. 用户可能是语音输入，会有同音字、口误、口语化表达。请根据上下文语义推断真实意图。
2. 用户经常使用简称或上下文暗示，而非完整名称。例如：
   - "创业里面要把论文投出去" → 匹配"知识产权（论文/专利）"（属于创业Leader）
   - "孙启尧那边" → 匹配"孙启尧（博士）"
   - "装修" → 匹配"新房交付与装修"
   - "国自科" → 可能匹配"国自科·青基"、"国自科·面上"、"国自科·35岁青A"中的一个或多个
   - "学生" → 根据上下文匹配具体的博士姓名
3. 如果用户提到了角色（如"创业"、"项目"、"家庭"），优先在该角色下寻找匹配。
4. 如果一条更新涉及多个工作线（如"国自科青基和面上都在准备"），请拆分为多条。
5. 即使只提到关键词而非完整名称，也要尝试匹配，并在status中如实记录用户描述的内容。`

  const body = {
    model: model || 'glm-4-flash',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: rawText },
    ],
    tools: [TOOL_DEFINITION],
    tool_choice: { type: 'function', function: { name: 'parse_work_updates' } },
  }

  const baseUrl = workerUrl.replace(/\/$/, '')
  const resp = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  })

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}))
    throw new Error(err.error?.message || err.message || `AI API error: ${resp.status}`)
  }

  const data = await resp.json()

  // Extract tool call result
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0]
  if (!toolCall) {
    throw new Error('AI 未返回结构化结果')
  }

  const args = JSON.parse(toolCall.function.arguments)
  return args.updates || []
}
