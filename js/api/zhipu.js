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

export async function parseWorkUpdates(rawText, existingStreamNames, aiConfig) {
  const { apiKey, model, workerUrl } = aiConfig

  if (!apiKey) throw new Error('未配置 AI API Key')
  if (!workerUrl) throw new Error('未配置 AI Worker URL')

  const systemPrompt = `你是一个工作线进度更新解析器。用户会输入一段话描述今天的工作进展，你需要识别出每条被提及的工作线，并提取对应的状态更新。

当前系统中的工作线列表如下：
${existingStreamNames.map((name, i) => `${i + 1}. ${name}`).join('\n')}

请尽量将用户提到的名称匹配到上述列表中的工作线。如果用户使用了简称或别名，也要尝试匹配。`

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
