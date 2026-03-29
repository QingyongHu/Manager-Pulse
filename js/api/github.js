const GITHUB_API = 'https://api.github.com'

export async function fetchDataFile(config) {
  const { token, owner, repo, path, branch } = config
  const url = `${GITHUB_API}/repos/${owner}/${repo}/contents/${path}?ref=${branch || 'data'}`

  const headers = {
    'Authorization': `token ${token}`,
    'Accept': 'application/vnd.github.v3+json',
  }

  const resp = await fetch(url, { headers })

  if (resp.status === 404) {
    return { content: null, sha: null }
  }

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}))
    throw new Error(err.message || `GitHub API error: ${resp.status}`)
  }

  const data = await resp.json()
  const content = JSON.parse(atob(data.content.replace(/\n/g, '')))
  return { content, sha: data.sha }
}

export async function writeDataFile(config, content, sha, message = 'Update data.json') {
  const { token, owner, repo, path, branch } = config
  const url = `${GITHUB_API}/repos/${owner}/${repo}/contents/${path}`

  const body = {
    message,
    content: btoa(unescape(encodeURIComponent(JSON.stringify(content, null, 2)))),
    branch: branch || 'data',
  }

  if (sha) body.sha = sha

  const resp = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': `token ${token}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (resp.status === 409) {
    throw new Error('CONFLICT')
  }

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}))
    throw new Error(err.message || `GitHub write error: ${resp.status}`)
  }

  const data = await resp.json()
  return { sha: data.content.sha }
}

export async function testConnection(config) {
  const { token, owner, repo, branch } = config
  const url = `${GITHUB_API}/repos/${owner}/${repo}`

  const resp = await fetch(url, {
    headers: {
      'Authorization': `token ${token}`,
      'Accept': 'application/vnd.github.v3+json',
    },
  })

  if (!resp.ok) {
    throw new Error(`Connection failed: ${resp.status}`)
  }

  return true
}
