import type { IconName } from './Icon.svelte'

export type NavItem = {
  href: string
  icon: IconName
  labelKey: 'nav.dashboard' | 'nav.runs' | 'nav.trends' | 'nav.records' | 'nav.settings'
}

export const navItems: NavItem[] = [
  { href: '#/', icon: 'dashboard', labelKey: 'nav.dashboard' },
  { href: '#/runs', icon: 'runs', labelKey: 'nav.runs' },
  { href: '#/trends', icon: 'trends', labelKey: 'nav.trends' },
  { href: '#/records', icon: 'records', labelKey: 'nav.records' },
  { href: '#/settings', icon: 'settings', labelKey: 'nav.settings' },
]
