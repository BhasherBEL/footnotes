import { en } from './en'
import { fr } from './fr'
import { settings } from '../settings/settings.svelte'

const dictionaries = { en, fr }

export const languages = [
  { code: 'en' as const, label: 'English' },
  { code: 'fr' as const, label: 'Français' },
]

export function t(key: keyof typeof en, vars?: Record<string, string | number>): string {
  const dictionary = dictionaries[settings.language]
  let text = dictionary[key] ?? en[key]
  if (vars) {
    for (const [name, value] of Object.entries(vars)) {
      text = text.replace(`{${name}}`, String(value))
    }
  }
  return text
}

export function tRunName(name: string): string {
  const key = `runName.${name}` as keyof typeof en
  return key in en ? t(key) : name
}
