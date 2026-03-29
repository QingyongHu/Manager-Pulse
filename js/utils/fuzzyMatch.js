export function fuzzyMatch(input, targets) {
  if (!input || !targets.length) return { match: null, score: 0 }

  const normalizedInput = input.toLowerCase().trim()

  let bestMatch = null
  let bestScore = 0

  for (const target of targets) {
    const normalizedTarget = target.toLowerCase()
    const cleanedTarget = normalizedTarget.replace(/[（）()·\s]/g, '')

    // Exact match
    if (normalizedInput === normalizedTarget || normalizedInput === cleanedTarget) {
      return { match: target, score: 1.0 }
    }

    // Contains match (input contains target or vice versa)
    if (cleanedTarget.includes(normalizedInput) || normalizedInput.includes(cleanedTarget)) {
      const score = 0.9 + 0.1 * Math.min(normalizedInput.length, normalizedTarget.length) / Math.max(normalizedInput.length, normalizedTarget.length)
      if (score > bestScore) {
        bestScore = score
        bestMatch = target
      }
      continue
    }

    // Keyword extraction: split on common delimiters and match keywords
    const inputKeywords = normalizedInput.split(/[,，、\s]+/).filter(k => k.length > 0)
    const targetParts = cleanedTarget.split(/[·\-—/]/).filter(k => k.length > 0)

    let keywordHits = 0
    for (const kw of inputKeywords) {
      if (targetParts.some(part => part.includes(kw) || kw.includes(part))) {
        keywordHits++
      }
    }
    if (keywordHits > 0) {
      const score = 0.6 + 0.3 * (keywordHits / Math.max(inputKeywords.length, targetParts.length))
      if (score > bestScore) {
        bestScore = score
        bestMatch = target
      }
      continue
    }

    // Character overlap score (fallback)
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
    if (score >= 0.7) confidence = 'high'
    else if (score >= 0.4) confidence = 'medium'

    return {
      ...result,
      matchedStream,
      confidence,
      matchScore: score,
      included: confidence !== 'low',
    }
  })
}
