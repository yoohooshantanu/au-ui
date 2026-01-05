<script lang="ts">
  import { logout, user } from "$lib/stores/auth";

  export let isMobileNavOpen = false;
  export let currentPath: string;

  // The 'icon' property has been completely removed.
  // "Manage Users" is now in the main navigation list.
  const navItems = [
    { href: "/", label: "Dashboard" },
    { href: "/subscribers", label: "Subscribers" },
    { href: "/payments", label: "Payments" },
    { href: "/coupons", label: "Coupons" },
    { href: "/pricing", label: "Pricing" },
    { href: "/users", label: "AU_POC" },
    { href: "/reports", label: "Reports" },
    { href: "/complaints", label: "Complaints" },
  ];

  const isActive = (href: string) => {
    if (href === "/") return currentPath === "/";
    return currentPath.startsWith(href);
  };
</script>

<!-- Backdrop for mobile nav -->
{#if isMobileNavOpen}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <div
    on:click={() => (isMobileNavOpen = false)}
    class="fixed inset-0 bg-black/60 z-30 lg:hidden"
    aria-hidden="true"
  ></div>
{/if}

<!-- Sidebar Navigation -->
<aside
  class="fixed top-0 left-0 h-full w-64 bg-gray-900 text-gray-300
           flex flex-col z-40 transition-transform transform
           {isMobileNavOpen
    ? 'translate-x-0'
    : '-translate-x-full'} lg:translate-x-0"
>

<!-- Logo / Header -->
<div class="h-16 flex items-center px-6 shadow-md bg-[#101828]">
  <a href="/" class="flex items-center">
    <img 
      src="https://2.bp.blogspot.com/-91e2PSMrZjE/TvSUGtNlGDI/AAAAAAAAD6U/iA-rHM7NIx8/s400/amar-ujala-logo.gif" 
      alt="Amar Ujala Logo" 
      class="h-12 w-auto object-contain"
    />
  </a>
</div>



  <!-- Main Navigation Links -->
  <nav class="flex-1 px-2 py-4 space-y-1">
    {#each navItems as item}
      <a
        href={item.href}
        class="nav-link"
        class:nav-link-active={isActive(item.href)}
        on:click={() => (isMobileNavOpen = false)}
      >
        <span>{item.label}</span>
      </a>
    {/each}
  </nav>

  <!-- User Profile Section -->
  <div class="px-2 py-4">
    <div class="flex items-center justify-between p-3 bg-gray-800 rounded-md">
      <!-- Left side: Avatar and Text -->
      <div class="flex items-center gap-3 min-w-0">
        <!-- Avatar -->
        <div
          class="w-8 h-8 rounded-full bg-indigo-500 text-white flex-shrink-0 flex items-center justify-center font-bold"
        >
          {$user?.initial ?? "A"}
        </div>
        <!-- Name and Email Wrapper -->
        <div class="min-w-0">
          <p class="text-sm font-semibold text-white truncate">
            {$user?.name ?? "Admin"}
          </p>
          <p class="text-xs text-gray-400 truncate">{$user?.email ?? ""}</p>
        </div>
      </div>
      <!-- Right side: Logout Button -->
      <button
        on:click={logout}
        class="rounded-md px-2.5 py-1 text-xs font-semibold text-gray-300 hover:bg-gray-700 hover:text-white transition-colors flex-shrink-0"
        aria-label="Logout"
      >
        Logout
      </button>
    </div>
  </div>
</aside>

<style>
  @reference '../../app.css';

  .nav-link {
    @apply block px-3 py-2.5 rounded-md text-sm font-medium text-gray-300 transition-colors hover:bg-gray-800 hover:text-white;
  }
  .nav-link-active {
    @apply bg-gray-800 text-white;
  }
</style>
