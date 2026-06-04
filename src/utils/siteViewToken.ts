export function createSiteViewToken() {
  const bytes = new Uint8Array(24)
  crypto.getRandomValues(bytes)

  const token = Array.from(bytes, (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('')

  return `site_${token}`
}

export function createSiteViewUrl(siteViewToken: string) {
  return `${window.location.origin}${window.location.pathname}#/site-view/${siteViewToken}`
}
