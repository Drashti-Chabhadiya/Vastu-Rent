import { useEffect, useState } from 'react'
import { Sun, Moon, Monitor } from 'lucide-react'

type ThemeMode = 'light' | 'dark' | 'auto'

function applyTheme(mode: ThemeMode) {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  const resolved    = mode === 'auto' ? (prefersDark ? 'dark' : 'light') : mode

  document.documentElement.classList.remove('light', 'dark')
  document.documentElement.classList.add(resolved)
  document.documentElement.style.colorScheme = resolved

  if (mode === 'auto') {
    document.documentElement.removeAttribute('data-theme')
  } else {
    document.documentElement.setAttribute('data-theme', mode)
  }
}

const MODES: ThemeMode[] = ['light', 'dark', 'auto']

const ICONS: Record<ThemeMode, React.ReactNode> = {
  light: <Sun  className="h-3.5 w-3.5" />,
  dark:  <Moon className="h-3.5 w-3.5" />,
  auto:  <Monitor className="h-3.5 w-3.5" />,
}

const LABELS: Record<ThemeMode, string> = {
  light: 'Light',
  dark:  'Dark',
  auto:  'Auto',
}

export default function ThemeToggle() {
  const [mode, setMode] = useState<ThemeMode>('auto')

  // Read saved preference on mount
  useEffect(() => {
    const saved = window.localStorage.getItem('theme') as ThemeMode | null
    const initial: ThemeMode =
      saved === 'light' || saved === 'dark' || saved === 'auto' ? saved : 'auto'
    setMode(initial)
    applyTheme(initial)
  }, [])

  // Re-apply when system preference changes (only relevant in 'auto' mode)
  useEffect(() => {
    if (mode !== 'auto') return
    const media    = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => applyTheme('auto')
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [mode])

  function cycle() {
    const next = MODES[(MODES.indexOf(mode) + 1) % MODES.length]
    setMode(next)
    applyTheme(next)
    window.localStorage.setItem('theme', next)
  }

  return (
    <button
      type="button"
      onClick={cycle}
      aria-label={`Theme: ${LABELS[mode]}. Click to cycle.`}
      title={`Theme: ${LABELS[mode]}`}
      className="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition hover:-translate-y-0.5"
      style={{
        borderColor: 'var(--chip-line)',
        background:  'var(--chip-bg)',
        color:       'var(--text-dark)',
      }}
    >
      {ICONS[mode]}
      <span>{LABELS[mode]}</span>
    </button>
  )
}
