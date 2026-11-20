<script module lang="ts">
  export type IconName = 'dashboard' | 'runs' | 'trends' | 'records' | 'settings' | 'folder'
</script>

<script lang="ts">
  let { name, size = 18 }: { name: IconName; size?: number } = $props()
</script>

<svg
  width={size}
  height={size}
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round"
  aria-hidden="true"
>
  {#if name === 'dashboard'}
    <rect x="3" y="3" width="7" height="9" rx="1.5"></rect>
    <rect x="14" y="3" width="7" height="5" rx="1.5"></rect>
    <rect x="14" y="12" width="7" height="9" rx="1.5"></rect>
    <rect x="3" y="16" width="7" height="5" rx="1.5"></rect>
  {:else if name === 'runs'}
    <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"></path>
  {:else if name === 'trends'}
    <path d="M3 17l6-6 4 4 8-8"></path>
    <path d="M15 7h6v6"></path>
  {:else if name === 'records'}
    <circle cx="12" cy="9" r="6"></circle>
    <path d="M8.5 14.5L7 22l5-3 5 3-1.5-7.5"></path>
  {:else if name === 'settings'}
    <circle cx="12" cy="12" r="3"></circle>
    <path
      d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"
    ></path>
  {:else if name === 'folder'}
    <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
  {/if}
</svg>
