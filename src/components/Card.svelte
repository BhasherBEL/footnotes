<script lang="ts">
  import type { Snippet } from 'svelte'

  let {
    title,
    subtitle,
    children,
  }: {
    title?: string
    subtitle?: string
    children: Snippet
  } = $props()
</script>

<section class="card">
  {#if title}
    <div class="heading">
      <h2>{title}</h2>
      {#if subtitle}
        <p>{subtitle}</p>
      {/if}
    </div>
  {/if}
  {@render children()}
</section>

<style>
  .card {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 14px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-card);
    padding: 20px 24px;
  }

  .heading h2 {
    font-size: 16px;
    font-weight: 600;
  }

  .heading p {
    margin: 2px 0 0;
    font-size: 13px;
    color: var(--muted);
  }
</style>
