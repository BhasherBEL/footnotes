<script lang="ts">
  import Icon from './Icon.svelte'
  import { navItems } from './navItems'
  import { t } from '../lib/i18n/index.svelte'

  let { route }: { route: string } = $props()
</script>

<nav aria-label={t('nav.main')}>
  {#each navItems as item (item.href)}
    <a
      href={item.href}
      aria-current={route === item.href ? 'page' : undefined}
      class:active={route === item.href}
    >
      <Icon name={item.icon} />
      <span>{t(item.labelKey)}</span>
    </a>
  {/each}
</nav>

<style>
  nav {
    display: none;
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 10;
    background: var(--surface);
    border-top: 1px solid var(--border);
    padding-bottom: env(safe-area-inset-bottom);
  }

  a {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    min-height: 56px;
    text-decoration: none;
    color: var(--muted);
  }

  a.active {
    color: var(--accent-strong);
  }

  span {
    font-size: 11px;
    font-weight: 500;
  }

  @media (max-width: 900px) {
    nav {
      display: flex;
    }
  }
</style>
