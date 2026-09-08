'use client'

import { useEffect } from 'react'

export function PWARegister() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          console.log('PWA ServiceWorker registered:', reg.scope)
        })
        .catch((err) => {
          console.error('PWA ServiceWorker registration failed:', err)
        })
    }
  }, [])

  return null
}
