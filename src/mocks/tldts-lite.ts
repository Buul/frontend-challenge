/**
 * Stand-in for `tldts`, aliased in `vite.config.ts`. MSW's cookie store (`tough-cookie`) only calls `getDomain`,
 * and the real package ships the whole Public Suffix List (~300 kB) on the critical path of every page load.
 * The mock backend sets no cookies, so a naive "last two labels" answer is enough; IPs and single labels
 * (e.g. `localhost`) have no registrable domain, as in `tldts`.
 */
export function getDomain(hostname: string | null | undefined): string | null {
  if (!hostname) return null
  if (/^[\d.]+$/.test(hostname) || hostname.includes(':')) return null
  const labels = hostname.toLowerCase().split('.').filter(Boolean)
  return labels.length >= 2 ? labels.slice(-2).join('.') : null
}
