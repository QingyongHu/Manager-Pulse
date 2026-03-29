export function fuzzyMatch(input, targets) {
  if (!input || !targets.length) return { match: null, score: 0 }

  const normalizedInput = input.toLowerCase().trim()

  let bestMatch = null
  let bestScore = 0

  for (const target of targets) {
    const normalizedTarget = target.toLowerCase()

    // Exact match
    if (normalizedInput === normalizedTarget) {
      return { match: target, score: 1.0 }
    }

    // Contains match
    const cleanedTarget = normalizedTarget.replace(/[（）()·\s]/g, '')
    if (normalizedTarget.includes(normalizedInput) || normalizedInput.includes(cleanedTarget)) {
      const score = Math.min(normalizedInput.length, normalizedTarget.length) / Math.max(normalizedInput.length, normalizedTarget.length)
      if (score > bestScore) {
        bestScore = score
        bestMatch = target
      }
      continue
    }

    // Character overlap score
    let matchCount = 0
    const inputChars = [...new Set(normalizedInput)]
    for (const ch of inputChars) {
      if (normalizedTarget.includes(ch)) matchCount++
    }
    const score = matchCount / inputChars.length
    if (score > bestScore) {
      bestScore = score
      bestMatch = target
    }
  }

  return { match: bestMatch, score: bestScore }
}

export function matchAllAiResults(aiResults, workStreams) {
  const names = workStreams.map(ws => ws.name)

  return aiResults.map(result => {
    const { match, score } = fuzzyMatch(result.stream_name, names)
    const matchedStream = match ? workStreams.find(ws => ws.name === match) : null

    let confidence = 'low'
    if (score >= 0.8) confidence = 'high'
    else if (score >= 0.5) confidence = 'medium'

    return {
      ...result,
      matchedStream,
      confidence,
      matchScore: score,
      included: confidence !== 'low',
    }
  })
}
