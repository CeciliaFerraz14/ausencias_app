import { useEffect, useState } from 'react'

export type Route = { name: 'home' } | { name: 'subject'; id: string }

// Si se llegó al detalle desde la lista, «volver» usa el historial para que
// el botón atrás del móvil no devuelva otra vez al detalle.
let cameFromHome = false

function parse(hash: string): Route {
  const m = hash.match(/^#\/a\/(.+)$/)
  return m ? { name: 'subject', id: decodeURIComponent(m[1]) } : { name: 'home' }
}

export function useRoute() {
  const [route, setRoute] = useState(() => parse(location.hash))
  useEffect(() => {
    const onChange = () => {
      const next = parse(location.hash)
      if (next.name === 'home') cameFromHome = false
      setRoute(next)
      window.scrollTo({ top: 0 })
    }
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return route
}

export function openSubject(id: string) {
  cameFromHome = true
  location.hash = `#/a/${encodeURIComponent(id)}`
}

export function goHome() {
  if (cameFromHome) {
    history.back()
  } else {
    history.replaceState(null, '', location.pathname + location.search)
    window.dispatchEvent(new HashChangeEvent('hashchange'))
  }
}
