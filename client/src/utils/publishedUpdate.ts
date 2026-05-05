const RELOAD_GUARD_KEY = 'ls:last-auto-reload-build'

function normalizeAssetPath(path: string): string {
  try {
    return new URL(path, window.location.origin).pathname
  } catch {
    return path
  }
}

function getCurrentEntryScriptPath(): string | null {
  const script = document.querySelector('script[type="module"][src]') as HTMLScriptElement | null
  const src = script?.getAttribute('src')
  return src ? normalizeAssetPath(src) : null
}

function getPublishedEntryScriptPath(html: string): string | null {
  const match = html.match(/<script\s+type="module"\s+crossorigin\s+src="([^"]+)"/i)
  return match?.[1] ? normalizeAssetPath(match[1]) : null
}

export async function checkForPublishedUpdate(): Promise<void> {
  if (import.meta.env.DEV) return

  try {
    const response = await fetch(`/index.html?__update_check=${Date.now()}`, {
      cache: 'no-store',
      headers: { 'cache-control': 'no-cache' },
    })
    if (!response.ok) return

    const html = await response.text()
    const currentEntry = getCurrentEntryScriptPath()
    const publishedEntry = getPublishedEntryScriptPath(html)
    if (!currentEntry || !publishedEntry || currentEntry === publishedEntry) return

    if (sessionStorage.getItem(RELOAD_GUARD_KEY) === publishedEntry) return
    sessionStorage.setItem(RELOAD_GUARD_KEY, publishedEntry)

    window.location.reload()
  } catch {
    // Ignore transient network/cache failures.
  }
}