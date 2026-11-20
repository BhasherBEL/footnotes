<script lang="ts">
  import Icon from './Icon.svelte'
  import DataFolder from './DataFolder.svelte'
  import { navItems } from './navItems'
  import { t } from '../lib/i18n/index.svelte'

  let { route }: { route: string } = $props()
</script>

<aside>
  <div class="brand">
    <svg width="30" height="30" viewBox="0 0 30 30" aria-hidden="true">
      <rect width="30" height="30" rx="8" fill="var(--accent)"></rect>
      <path
        d="M6 17h5l2.5-6 4 10 2.5-4H24"
        fill="none"
        stroke="#FFFFFF"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      ></path>
    </svg>
    <span class="wordmark">{t('app.title')}</span>
  </div>
  <nav aria-label={t('nav.main')}>
    {#each navItems as item (item.href)}
      <a
        href={item.href}
        aria-current={route === item.href ? 'page' : undefined}
        class:active={route === item.href}
      >
        <Icon name={item.icon} />
        {t(item.labelKey)}
      </a>
    {/each}
  </nav>
  <div class="folder"><DataFolder /></div>
</aside>

<style>
  aside {
    flex: 1 1 220px;
    box-sizing: border-box;
    background: var(--surface);
    border-right: 1px solid var(--border);
    padding: 24px 16px;
    display: flex;
    flex-direction: column;
    gap: 28px;
    position: sticky;
    top: 0;
    align-self: flex-start;
    height: 100vh;
    overflow-y: auto;
  }

  .brand {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 0 8px;
  }

  .wordmark {
    font-family: var(--font-display);
    font-weight: 700;
    font-size: 17px;
    letter-spacing: -0.01em;
  }

  nav {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  a {
    display: flex;
    align-items: center;
    gap: 10px;
    min-height: 44px;
    padding: 0 12px;
    border-radius: 8px;
    text-decoration: none;
    color: var(--text-2);
    font-weight: 500;
  }

  a.active {
    background: var(--accent-soft);
    color: var(--accent-strong);
    font-weight: 600;
  }

  .folder {
    display: contents;
  }

  @media (max-width: 900px) {
    .folder {
      display: none;
    }

    nav {
      display: none;
    }

    aside {
      flex: none;
      flex-direction: row;
      align-items: center;
      gap: 0;
      padding: 12px 16px;
      border-right: none;
      border-bottom: 1px solid var(--border);
      max-width: 100%;
      position: static;
      align-self: stretch;
      height: auto;
      overflow-y: visible;
    }
  }
</style>
