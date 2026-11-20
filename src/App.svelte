<script lang="ts">
  import Sidebar from './components/Sidebar.svelte'
  import BottomNav from './components/BottomNav.svelte'
  import Dashboard from './pages/Dashboard.svelte'
  import Runs from './pages/Runs.svelte'
  import Trends from './pages/Trends.svelte'
  import Records from './pages/Records.svelte'
  import Settings from './pages/Settings.svelte'
  import Welcome from './pages/Welcome.svelte'
  import Run from './pages/Run.svelte'
  import SkippedFiles from './components/SkippedFiles.svelte'
  import ImportProgress from './components/ImportProgress.svelte'
  import { t } from './lib/i18n/index.svelte'
  import { settings, saveSettings } from './lib/settings/settings.svelte'
  import { loadCachedRuns, runsState } from './lib/data/runs.svelte'

  loadCachedRuns()

  const knownRoutes = ['#/', '#/runs', '#/trends', '#/records', '#/settings']

  const runPrefix = '#/run/'

  function readRoute(): string {
    const hash = location.hash
    if (hash.startsWith(runPrefix)) return hash
    return knownRoutes.includes(hash) ? hash : '#/'
  }

  let route = $state(readRoute())

  $effect(() => {
    function onHashChange() {
      route = readRoute()
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  })

  $effect(() => {
    saveSettings()
  })

  $effect(() => {
    document.documentElement.lang = settings.language
  })
</script>

<div class="shell">
  <Sidebar {route} />
  <main>
    {#if runsState.runs.length > 0 && runsState.importing}
      <ImportProgress />
    {/if}
    <SkippedFiles />
    {#if !runsState.loaded}
      <p class="loading">{t('app.loading')}</p>
    {:else if runsState.runs.length === 0}
      <Welcome />
    {:else if route.startsWith(runPrefix)}
      <Run id={decodeURIComponent(route.slice(runPrefix.length))} />
    {:else if route === '#/'}
      <Dashboard />
    {:else if route === '#/runs'}
      <Runs />
    {:else if route === '#/trends'}
      <Trends />
    {:else if route === '#/records'}
      <Records />
    {:else if route === '#/settings'}
      <Settings />
    {/if}
  </main>
  <BottomNav {route} />
</div>

<style>
  .shell {
    display: flex;
    flex-wrap: wrap;
    min-height: 100vh;
  }

  .loading {
    margin: 0;
    color: var(--muted);
  }

  main {
    flex: 999 1 560px;
    min-width: 0;
    box-sizing: border-box;
    padding: 28px 40px 48px;
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  @media (max-width: 900px) {
    .shell {
      flex-direction: column;
      flex-wrap: nowrap;
    }

    main {
      width: 100%;
      padding: 20px 16px calc(76px + env(safe-area-inset-bottom));
    }
  }
</style>
