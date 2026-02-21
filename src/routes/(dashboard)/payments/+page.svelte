<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { getPaymentCycles, type PaginatedPaymentCycles } from '$lib/api/payment_cycles';
	import Pagination from '$lib/components/Pagination.svelte';

	let cyclesData: PaginatedPaymentCycles | null = null;
	let error: string | null = null;
	let isLoading = true;

	// State for filters
	let filters = {
		is_due: $page.url.searchParams.get('is_due') as 'true' | 'false' | null,
		month: $page.url.searchParams.get('month') ?? ''
	};

	// Helper to apply filters by navigating to a new URL
	function applyFilters() {
		const query = new URLSearchParams($page.url.searchParams);
		if (filters.is_due !== null) {
			query.set('is_due', filters.is_due);
		} else {
			query.delete('is_due');
		}

		if (filters.month) {
			query.set('month', filters.month);
		} else {
			query.delete('month');
		}
		query.set('page', '1'); // Reset to page 1 on filter change
		goto(`/dashboard/payments?${query.toString()}`, { keepFocus: true, noScroll: true });
	}

	function resetFilters() {
		filters.is_due = null;
		filters.month = '';
		goto('/dashboard/payments', { keepFocus: true, noScroll: true });
	}

	async function loadData() {
		isLoading = true;
		error = null;
		try {
			const pageNum = Number($page.url.searchParams.get('page') ?? '1');
			const isDueParam = $page.url.searchParams.get('is_due');
			const isDue = isDueParam === null ? null : isDueParam === 'true';
			const month = $page.url.searchParams.get('month') ?? undefined;

			cyclesData = await getPaymentCycles({ page: pageNum, is_due: isDue, month });
		} catch (e: any) {
			error = e.message;
		} finally {
			isLoading = false;
		}
	}

	// Load data on mount and when the URL changes
	onMount(loadData);
	$: $page.url, loadData();

	function formatDate(dateString: string | null) {
		if (!dateString) return 'N/A';
		return new Date(dateString).toLocaleDateString('en-GB', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});
	}

	function handlePageChange(event: CustomEvent<number>) {
		const query = new URLSearchParams($page.url.searchParams);
		query.set('page', event.detail.toString());
		goto(`/dashboard/payments?${query.toString()}`);
	}
</script>

<div>
	<div class="mb-6">
		<h1 class="text-3xl font-bold text-gray-900">All Payment Cycles</h1>
		<p class="text-gray-600 mt-1">View and manage all billing records across readers.</p>
	</div>

	<!-- Filter Bar -->
	<div class="bg-white p-4 rounded-lg shadow-sm mb-6">
		<form on:submit|preventDefault={applyFilters} class="grid grid-cols-1 md:grid-cols-3 gap-4">
			<div>
				<label for="status" class="block text-sm font-medium text-gray-700">Payment Status</label>
				<select
					id="status"
					bind:value={filters.is_due}
					on:change={applyFilters}
					class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
				>
					<option value={null}>All</option>
					<option value={'true'}>Due</option>
					<option value={'false'}>Paid</option>
				</select>
			</div>
			<div>
				<label for="month" class="block text-sm font-medium text-gray-700">Billing Month</label>
				<input
					type="month"
					id="month"
					bind:value={filters.month}
					on:change={applyFilters}
					class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
				/>
			</div>
			<div class="flex items-end">
				<button
					type="button"
					on:click={resetFilters}
					class="w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
				>
					Reset Filters
				</button>
			</div>
		</form>
	</div>

	<!-- Data Table -->
	<div class="bg-white rounded-lg shadow-sm overflow-hidden">
		<div class="overflow-x-auto">
			<table class="w-full min-w-[800px]">
				<thead class="bg-gray-50">
					<tr>
						<th class="p-4 text-left text-xs font-semibold text-gray-500 uppercase">Reader</th>
						<th class="p-4 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
						<th class="p-4 text-right text-xs font-semibold text-gray-500 uppercase">Amount</th>
						<th class="p-4 text-left text-xs font-semibold text-gray-500 uppercase">Billing Period</th>
						<th class="p-4 text-left text-xs font-semibold text-gray-500 uppercase">Last Payment</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-gray-200">
					{#if isLoading}
						{#each { length: 8 } as _}
							<tr class="animate-pulse">
								<td class="p-4"><div class="h-4 bg-gray-200 rounded w-3/4"></div></td>
								<td class="p-4"><div class="h-4 bg-gray-200 rounded w-1/2"></div></td>
								<td class="p-4"><div class="h-4 bg-gray-200 rounded w-1/4 ml-auto"></div></td>
								<td class="p-4"><div class="h-4 bg-gray-200 rounded w-2/3"></div></td>
								<td class="p-4"><div class="h-4 bg-gray-200 rounded w-1/2"></div></td>
							</tr>
						{/each}
					{:else if cyclesData && cyclesData.items.length > 0}
						{#each cyclesData.items as cycle (cycle.id)}
							<tr class="hover:bg-gray-50">
								<td class="p-4 font-medium text-gray-800">
									<div>{cycle.subscriber_details?.name ?? 'N/A'}</div>
									<div class="text-xs text-gray-500">{cycle.subscriber_details?.phone ?? ''}</div>
								</td>
								<td class="p-4">
									{#if cycle.is_due}
										<span class="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
											Due
										</span>
									{:else}
										<span class="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
											Paid
										</span>
									{/if}
								</td>
								<td class="p-4 font-mono text-gray-800 text-right">Rs. {cycle.amount}</td>
								<td class="p-4 text-sm text-gray-600">
									{formatDate(cycle.start_date)} - {formatDate(cycle.end_date)}
								</td>
								<td class="p-4 text-sm text-gray-600">{formatDate(cycle.last_payment)}</td>
							</tr>
						{/each}
					{:else}
						<tr><td colspan="5" class="p-8 text-center text-gray-500">No payment cycles found.</td></tr>
					{/if}
				</tbody>
			</table>
		</div>
	</div>

    {#if cyclesData && cyclesData.totalPages > 1}
        <Pagination
            currentPage={cyclesData.page}
            totalPages={cyclesData.totalPages}
            totalItems={cyclesData.totalItems}
            perPage={cyclesData.perPage}
            on:changePage={handlePageChange}
        />
    {/if}
</div>