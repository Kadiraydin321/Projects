'use client'

import * as React from 'react'
import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <div style={{ width: '36px', height: '36px' }}></div>
  }

  return (
    <button
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      style={{
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--muted)',
        width: '36px',
        height: '36px',
        borderRadius: '50%',
        transition: 'var(--transition)',
      }}
      title="Temayı Değiştir"
      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'}
      onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
    >
      {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
    </button>
  )
}
