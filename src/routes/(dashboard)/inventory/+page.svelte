<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { createInventoryAllocation, type InventoryAllocation } from '$lib/api/inventory';
	import { isAdmin } from '$lib/auth';
	import type { Lookups } from '$lib/api/dashboard';
	import InventoryAllocationForm from '$lib/components/inventory/InventoryAllocationForm.svelte';
	import InventorySummaryTable from '$lib/components/inventory/InventorySummaryTable.svelte';
	import InventoryAllocationTable from '$lib/components/inventory/InventoryAllocationTable.svelte';

	export let data;
	let allocations: InventoryAllocation[] = data.allocations;
	let summaries = data.summaries;
	let lookups: Lookups = data.lookups;
	let error = data.error;

	let showAllocationForm = false;
	let isLoading = false;
	let canEdit = false;

	// Check if current user can edit inventory
	onMount(() => {
		canEdit = isAdmin();
	});

	// Local filter state
	let centerFilter = data.filters.center ?? '';
	let fromDateFilter = data.filters.fromDate;
	let toDateFilter = data.filters.toDate;

	function applyFilters() {
		const q = new URLSearchParams();
		if (centerFilter) q.set('center', centerFilter);
		q.set('fromDate', fromDateFilter);
		q.set('toDate', toDateFilter);
		goto(`?${q.toString()}`, { replaceState: true, noScroll: true });
	}

	async function handleAllocation(payload: { center: string; date: string; quantity: number; added_by: string }) {
		isLoading = true;
		try {
			await createInventoryAllocation(payload);
			showAllocationForm = false;
			// Refresh the page
			window.location.reload();
		} catch (e: any) {
			alert(`Failed to allocate: ${e.message}`);
		} finally {
			isLoading = false;
		}
	}
</script>

<div class="px-4 sm:px-6 lg:px-8">
	<div class="sm:flex sm:items-center">
		<div class="sm:flex-auto">
			<h1 class="text-2xl font-semibold text-gray-900">Inventory Management</h1>
			<p class="mt-2 text-sm text-gray-700">Manage stock allocations and view remaining inventory per center.</p>
		</div>
		{#if canEdit}
			<div class="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
				<button on:click={() => (showAllocationForm = true)} class="btn-primary" disabled={isLoading}>
					{isLoading ? 'Saving...' : 'Allocate Stock'}
				</button>
			</div>
		{/if}
	</div>

	{#if error}
		<div class="mt-4 text-red-600">{error}</div>
	{/if}

	<!-- Filters -->
	<div class="mt-6 bg-white p-4 rounded-lg shadow">
		<h3 class="text-lg font-medium text-gray-900 mb-4">Filters</h3>
		<form
			on:submit|preventDefault={applyFilters}
			class="grid grid-cols-1 md:grid-cols-4 gap-4"
		>
			<div>
				<label for="center" class="label">Center</label>
				<select id="center" bind:value={centerFilter} class="input">
					<option value="">All Centers</option>
					{#each lookups?.center_names ?? [] as center}
						<option value={center}>{center}</option>
					{/each}
				</select>
			</div>
			<div>
				<label for="fromDate" class="label">From Date</label>
				<input id="fromDate" type="date" bind:value={fromDateFilter} class="input" />
			</div>
			<div>
				<label for="toDate" class="label">To Date</label>
				<input id="toDate" type="date" bind:value={toDateFilter} class="input" />
			</div>
			<div class="flex items-end">
				<button type="submit" class="btn-primary">Apply</button>
			</div>
		</form>
	</div>

	<!-- Inventory Summary -->
	<InventorySummaryTable {summaries} />

	<!-- Allocations Table -->
	<InventoryAllocationTable {allocations} />
</div>

{#if showAllocationForm}
	<InventoryAllocationForm
		{lookups}
		on:cancel={() => (showAllocationForm = false)}
		on:save={(e) => handleAllocation(e.detail)}
	/>
{/if}

<style>
	@reference '../../../app.css';
	.btn-primary {
		@apply rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50;
	}
	.label {
		@apply block text-sm font-medium leading-6 text-gray-900;
	}
	.input {
		@apply block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6;
	}
</style>
