const EXPLICIT_API_BASE_URL = String(import.meta.env.VITE_API_URL || '').trim()
const DEV_API_BASE_CANDIDATES = ['http://localhost:3000', 'http://localhost:3001']

let resolvedApiBaseUrl: string | null = null
let resolutionInFlight: Promise<string> | null = null

function buildUrl(baseUrl: string, requestPath: string) {
  const normalizedPath = requestPath.startsWith('/') ? requestPath : `/${requestPath}`
  return `${baseUrl}${normalizedPath}`
}

async function probeCatalog(baseUrl: string) {
  try {
    const response = await fetch(buildUrl(baseUrl, '/game/catalog'))
    if (!response.ok) return null

    const payload = await response.json()
    const jobs = Array.isArray(payload?.jobs) ? payload.jobs.length : 0
    const academyCourses = Array.isArray(payload?.academyCourses) ? payload.academyCourses.length : 0

    return {
      baseUrl,
      score: jobs * 100 + academyCourses,
    }
  } catch {
    return null
  }
}

export async function resolveApiBaseUrl() {
  if (EXPLICIT_API_BASE_URL) return EXPLICIT_API_BASE_URL
  if (!import.meta.env.DEV) return ''
  if (resolvedApiBaseUrl) return resolvedApiBaseUrl

  if (!resolutionInFlight) {
    resolutionInFlight = (async () => {
      const probes = await Promise.all(DEV_API_BASE_CANDIDATES.map((baseUrl) => probeCatalog(baseUrl)))
      const candidates = probes.filter((entry): entry is { baseUrl: string; score: number } => Boolean(entry))

      if (candidates.length > 0) {
        candidates.sort((left, right) => right.score - left.score)
        resolvedApiBaseUrl = candidates[0].baseUrl
        return resolvedApiBaseUrl
      }

      resolvedApiBaseUrl = DEV_API_BASE_CANDIDATES[0]
      return resolvedApiBaseUrl
    })().finally(() => {
      resolutionInFlight = null
    })
  }

  return resolutionInFlight
}

export async function apiFetch(requestPath: string, init?: RequestInit) {
  const baseUrl = await resolveApiBaseUrl()
  return fetch(buildUrl(baseUrl, requestPath), init)
}
