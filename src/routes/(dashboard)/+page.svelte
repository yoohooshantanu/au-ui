<script lang="ts">
	import { onMount } from 'svelte';
	// We are re-introducing the API call.
	import { getDashboardStats, type DashboardStats } from '$lib/api/dashboard';

	// The CountUp import is GONE.

	let stats: DashboardStats | null = null;
	let isLoading = true;
	let error: string | null = null;

	onMount(async () => {
		try {
			// Fetch the data from your (mocked) API endpoint.
			stats = await getDashboardStats();
		} catch (e: any) {
			error = e.message;
		} finally {
			isLoading = false;
		}
	});

	/**
	 * A robust helper function to format numbers for display.
	 * This uses the built-in browser API and is guaranteed to work.
	 */
	function formatNumber(num: number, precision: number = 0): string {
		if (num === null || num === undefined || isNaN(num)) {
			return '0'; // Return a default value if data is invalid
		}
		// Uses the Indian numbering system (lakhs, crores) and sets decimal places.
		return num.toLocaleString('en-IN', {
			minimumFractionDigits: precision,
			maximumFractionDigits: precision
		});
	}
</script>

<div>
	<div class="mb-8">
		<h1 class="text-3xl font-bold text-gray-900">Dashboard Overview</h1>
		<p class="text-gray-600 mt-1">A real-time summary of your operations.</p>
	</div>

	{#if isLoading}
		<!-- Loading Skeleton with pulsing animation -->
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-pulse">
			{#each { length: 4 } as _}
				<div class="bg-gray-200 h-32 rounded-lg"></div>
			{/each}
		</div>
	{:else if error}
		<div class="bg-red-100 border-l-4 border-red-500 text-red-700 p-4" role="alert">
			<p class="font-bold">Error Loading Data</p>
			<p>{error}</p>
		</div>
	{:else if stats}
		<!-- The main statistics grid with static, formatted numbers -->
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
			<!-- Total Subscribers Card -->
			<div class="stat-card">
				<p class="stat-title">Total Subscribers</p>
				<p class="stat-value text-indigo-600">
					{formatNumber(stats.total_subscribers)}
				</p>
			</div>

			<!-- Total Due Amount Card -->
			<div class="stat-card">
				<p class="stat-title">Total Due Amount</p>
				<p class="stat-value text-orange-600">
					<span class="text-2xl align-baseline">₹</span>{formatNumber(stats.total_due_amount, 2)}
				</p>
			</div>

			<!-- Revenue This Month Card -->
			<div class="stat-card">
				<p class="stat-title">Revenue This Month</p>
				<p class="stat-value text-green-600">
					<span class="text-2xl align-baseline">₹</span>{formatNumber(stats.revenue_this_month, 2)}
				</p>
			</div>

			<!-- New Subscribers Card -->
			<div class="stat-card">
				<p class="stat-title">New Subscribers</p>
				<p class="stat-value text-blue-600">
					+{formatNumber(stats.new_subscribers_this_month)}
				</p>
			</div>
		</div>

		<!-- Quick Actions -->
		<div class="mt-8">
			<h2 class="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
			<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
				<a href="/inventory" class="block p-6 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow">
					<h3 class="text-lg font-medium text-gray-900">Inventory Management</h3>
					<p class="mt-1 text-sm text-gray-500">Allocate stock and view remaining inventory per center.</p>
				</a>
				<a href="/users" class="block p-6 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow">
					<h3 class="text-lg font-medium text-gray-900">AU POCs</h3>
					<p class="mt-1 text-sm text-gray-500">Manage point-of-contact users for cities and centers.</p>
				</a>
				<a href="/reports/monthly-billing" class="block p-6 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow">
					<h3 class="text-lg font-medium text-gray-900">Monthly Billing</h3>
					<p class="mt-1 text-sm text-gray-500">View billing reports with dynamic pricing applied.</p>
				</a>
			</div>
		</div>
	{/if}
</div>

<style>
	@reference '../../app.css';

	.stat-card {
		@apply bg-white p-6 rounded-lg shadow-sm border border-gray-200 transition-all hover:shadow-md hover:-translate-y-1;
	}
	.stat-title {
		@apply text-sm font-medium text-gray-500 tracking-wide;
	}
	.stat-value {
		@apply text-4xl font-bold mt-2;
	}
</style>