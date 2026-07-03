<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { getPaymentCycles, deletePaymentCycle, type PaginatedPaymentCycles } from '$lib/api/payment_cycles';
	import Pagination from '$lib/components/Pagination.svelte';
	import BulkGenerateBillsModal from '$lib/components/subscribers/BulkGenerateBillsModal.svelte';
	import { isAdmin as checkIsAdmin, getCurrentUser, getUserCenters } from '$lib/auth';
	import { listPriceRules, type PriceRule } from '$lib/api/price_rules';
	import { computeCycleTotal, DEFAULT_DAILY_PRICE } from '$lib/utils/pricing';

	let cyclesData: PaginatedPaymentCycles | null = null;
	let error: string | null = null;
	let isLoading = true;
	let isDeletingAll = false;
	let userIsAdmin = false;
	let showGenerateModal = false;
	let priceRules: PriceRule[] = [];
	
	let selectedCycles: string[] = [];
	let isBulkSending = false;

	onMount(() => {
		userIsAdmin = checkIsAdmin();
		loadData();
	});

	let filters = {
		is_due: $page.url.searchParams.get('is_due') as 'true' | 'false' | null,
		month: $page.url.searchParams.get('month') ?? '',
		search: $page.url.searchParams.get('search') ?? '',
		center: $page.url.searchParams.get('center') ?? ''
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

		if (filters.search) {
			query.set('search', filters.search);
		} else {
			query.delete('search');
		}

		if (filters.center) {
			query.set('center', filters.center);
		} else {
			query.delete('center');
		}

		query.set('page', '1'); // Reset to page 1 on filter change
		goto(`/dashboard/payments?${query.toString()}`, { keepFocus: true, noScroll: true });
	}

	function resetFilters() {
		filters.is_due = null;
		filters.month = '';
		filters.search = '';
		filters.center = '';
		goto('/dashboard/payments', { keepFocus: true, noScroll: true });
	}

	async function loadData() {
		isLoading = true;
		error = null;
		selectedCycles = []; // Reset selection
		try {
			const pageNum = Number($page.url.searchParams.get('page') ?? '1');
			const isDueParam = $page.url.searchParams.get('is_due');
			const isDue = isDueParam === null ? null : isDueParam === 'true';
			const month = $page.url.searchParams.get('month') ?? undefined;
			const search = $page.url.searchParams.get('search') ?? undefined;
			const center = $page.url.searchParams.get('center') ?? undefined;

			priceRules = await listPriceRules().catch(() => []);

			const user = getCurrentUser();
			const isUserAdmin = checkIsAdmin();
			const userCenters = getUserCenters(user);

			cyclesData = await getPaymentCycles({ 
				page: pageNum, 
				is_due: isDue, 
				month, 
				search, 
				center,
				centerFilter: isUserAdmin ? undefined : userCenters
			});
		} catch (e: any) {
			error = e.message;
		} finally {
			isLoading = false;
		}
	}

	$: $page.url, loadData();

	async function handleDeleteAllPayments() {
		if (!confirm('Are you sure you want to delete ALL payment data? This cannot be undone!')) return;
		if (!confirm('This is your FINAL WARNING. All payment cycles will be permanently deleted. Continue?')) return;
		isDeletingAll = true;
		try {
			// Fetch all payment cycles and delete them one by one
			let page = 1;
			let deleted = 0;
			while (true) {
				const res = await getPaymentCycles({ page, perPage: 100 });
				if (res.items.length === 0) break;
				for (const cycle of res.items) {
					await deletePaymentCycle(cycle.id);
					deleted++;
				}
				if (page >= res.totalPages) break;
				page++;
			}
			alert(`Successfully deleted ${deleted} payment records.`);
			await loadData();
		} catch (e: any) {
			alert('Failed to delete payment data: ' + (e.message || 'Unknown error'));
		} finally {
			isDeletingAll = false;
		}
	}

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

	function ymdFromIso(iso: string) {
		if (!iso) return '';
		if (iso.includes('T')) return iso.split('T')[0];
		return iso;
	}

	function computedTotal(cycle: any) {
		if (!cycle.subscriber_details) return Number(cycle.amount || 0);
		try {
			const startYmd = ymdFromIso(cycle.start_date);
			const endYmd = ymdFromIso(cycle.end_date);
			return computeCycleTotal({ 
				subscriber: cycle.subscriber_details, 
				startYmd, 
				endYmd, 
				rules: priceRules, 
				defaultPrice: DEFAULT_DAILY_PRICE 
			});
		} catch (e) {
			return Number(cycle.amount || 0);
		}
	}

	// Bulk SMS Functions
	function toggleAll(e: Event) {
		const target = e.target as HTMLInputElement;
		if (target.checked && cyclesData) {
			selectedCycles = cyclesData.items.map(c => c.id);
		} else {
			selectedCycles = [];
		}
	}

	function getMonthName(isoStr: string) {
		if (!isoStr) return '';
		const d = new Date(isoStr);
		if (isNaN(d.getTime())) return '';
		return d.toLocaleString('en-US', { month: 'long' });
	}
	
	function formatDateDLT(isoStr: string) {
		if (!isoStr) return '';
		const d = new Date(isoStr);
		if (isNaN(d.getTime())) return isoStr;
		const day = String(d.getDate()).padStart(2, '0');
		const month = String(d.getMonth() + 1).padStart(2, '0');
		const year = d.getFullYear();
		return `${day}-${month}-${year}`;
	}

	async function bulkSendSMS(type: 'reminder' | 'payment_link') {
		if (!cyclesData || selectedCycles.length === 0) return;
		if (!confirm(`Are you sure you want to send the ${type === 'reminder' ? 'Reminder' : 'Payment Link'} message to ${selectedCycles.length} selected readers?`)) return;
		
		isBulkSending = true;
		let successCount = 0;
		let failCount = 0;

		try {
			for (const cycleId of selectedCycles) {
				const cycle = cyclesData.items.find(c => c.id === cycleId);
				if (!cycle || !cycle.subscriber_details || !cycle.subscriber_details.phone) {
					failCount++;
					continue;
				}

				const amount = computedTotal(cycle) - Number(cycle.coupon_amount || 0);
				const phone = cycle.subscriber_details.phone;
				const startDate = formatDateDLT(cycle.start_date);
				const endDate = formatDateDLT(cycle.end_date);
				const month = getMonthName(cycle.start_date);
				const dueDate = formatDateDLT((cycle as any).due_date || cycle.end_date);

				const variables = {
					name: cycle.subscriber_details.name,
					month: month,
					amount: amount.toString(),
					total: amount.toString(),
					dueDate: dueDate,
					startDate: startDate,
					endDate: endDate,
					paymentCycleId: cycle.id
				};

				const response = await fetch('/app-api/sms', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						phoneNumber: phone,
						templateType: type,
						variables
					})
				});

				const resultText = await response.text();
				const isProviderError = resultText.toLowerCase().includes('error') || resultText.toLowerCase().includes('fail');

				if (response.ok && !isProviderError) {
					successCount++;
				} else {
					console.error(`SMS Failed for ${phone}:`, resultText);
					failCount++;
				}
			}
			
			alert(`Bulk Send Complete!\n\nSuccessful: ${successCount}\nFailed (or missing phone): ${failCount}`);
			selectedCycles = [];
		} catch (e: any) {
			alert('Bulk send interrupted: ' + e.message);
		} finally {
			isBulkSending = false;
		}
	}
</script>

<div>
	<div class="mb-6">
		<div class="flex justify-between items-center flex-wrap gap-3">
			<div>
				<h1 class="text-3xl font-bold text-gray-900">All Payment Cycles</h1>
				<p class="text-gray-600 mt-1">View and manage all billing records across readers.</p>
			</div>
			{#if userIsAdmin}
				<div class="flex gap-2">
					<button
						on:click={() => (showGenerateModal = true)}
						class="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
					>
						Bulk Generate Bills
					</button>
					<button
						on:click={handleDeleteAllPayments}
						disabled={isDeletingAll}
						class="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 disabled:opacity-50"
					>
						{isDeletingAll ? 'Deleting...' : 'Delete All Payment Data'}
					</button>
				</div>
			{/if}
		</div>
	</div>

	<!-- Filter Bar -->
	<div class="bg-white p-4 rounded-lg shadow-sm mb-6">
		<form on:submit|preventDefault={applyFilters} class="grid grid-cols-1 md:grid-cols-5 gap-4">
			<div>
				<label for="search" class="block text-sm font-medium text-gray-700">Search Reader</label>
				<input
					type="text"
					id="search"
					placeholder="Name or Phone"
					bind:value={filters.search}
					class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
				/>
			</div>
			<div>
				<label for="center" class="block text-sm font-medium text-gray-700">Center Name</label>
				<input
					type="text"
					id="center"
					placeholder="Center Name"
					bind:value={filters.center}
					class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
				/>
			</div>
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
			<div class="flex items-end gap-2">
				<button
					type="submit"
					class="w-full justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm ring-1 ring-inset ring-indigo-600 hover:bg-indigo-500"
				>
					Apply
				</button>
				<button
					type="button"
					on:click={resetFilters}
					class="w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
				>
					Reset
				</button>
			</div>
		</form>
	</div>

	<!-- Bulk Action Bar -->
	{#if selectedCycles.length > 0}
	<div class="bg-indigo-50 p-4 rounded-lg shadow-sm mb-6 flex justify-between items-center border border-indigo-100">
		<div class="text-indigo-800 font-medium">
			{selectedCycles.length} payment(s) selected
		</div>
		<div class="flex gap-2">
			<button
				on:click={() => bulkSendSMS('reminder')}
				disabled={isBulkSending}
				class="rounded-md bg-white px-4 py-2 text-sm font-semibold text-indigo-700 shadow-sm ring-1 ring-inset ring-indigo-300 hover:bg-indigo-50 disabled:opacity-50"
			>
				{isBulkSending ? 'Sending...' : 'Bulk Send Reminder'}
			</button>
			<button
				on:click={() => bulkSendSMS('payment_link')}
				disabled={isBulkSending}
				class="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50"
			>
				{isBulkSending ? 'Sending...' : 'Bulk Send Payment Link'}
			</button>
		</div>
	</div>
	{/if}

	<!-- Data Table -->
	<div class="bg-white rounded-lg shadow-sm overflow-hidden">
		<div class="overflow-x-auto">
			<table class="w-full min-w-[800px]">
				<thead class="bg-gray-50">
					<tr>
						<th class="p-4 w-12"><input type="checkbox" on:change={toggleAll} checked={cyclesData !== null && cyclesData.items.length > 0 && selectedCycles.length === cyclesData.items.length} class="rounded border-gray-300 text-indigo-600 focus:ring-indigo-600" /></th>
						<th class="p-4 text-left text-xs font-semibold text-gray-500 uppercase">Reader</th>
						<th class="p-4 text-left text-xs font-semibold text-gray-500 uppercase">Unit & Center</th>
						<th class="p-4 text-left text-xs font-semibold text-gray-500 uppercase">Executive</th>
						<th class="p-4 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
						<th class="p-4 text-right text-xs font-semibold text-gray-500 uppercase">Amount</th>
						<th class="p-4 text-right text-xs font-semibold text-gray-500 uppercase">Coupon</th>
						<th class="p-4 text-right text-xs font-semibold text-gray-500 uppercase">Total Cash</th>
						<th class="p-4 text-left text-xs font-semibold text-gray-500 uppercase">Billing Period</th>
						<th class="p-4 text-left text-xs font-semibold text-gray-500 uppercase">Last Payment</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-gray-200">
					{#if isLoading}
						{#each { length: 8 } as _}
							<tr class="animate-pulse">
								<td class="p-4"><div class="h-4 bg-gray-200 rounded w-4"></div></td>
								<td class="p-4"><div class="h-4 bg-gray-200 rounded w-3/4"></div></td>
								<td class="p-4"><div class="h-4 bg-gray-200 rounded w-2/3"></div></td>
								<td class="p-4"><div class="h-4 bg-gray-200 rounded w-1/2"></div></td>
								<td class="p-4"><div class="h-4 bg-gray-200 rounded w-1/2"></div></td>
								<td class="p-4"><div class="h-4 bg-gray-200 rounded w-1/4 ml-auto"></div></td>
								<td class="p-4"><div class="h-4 bg-gray-200 rounded w-1/4 ml-auto"></div></td>
								<td class="p-4"><div class="h-4 bg-gray-200 rounded w-1/4 ml-auto"></div></td>
								<td class="p-4"><div class="h-4 bg-gray-200 rounded w-2/3"></div></td>
								<td class="p-4"><div class="h-4 bg-gray-200 rounded w-1/2"></div></td>
							</tr>
						{/each}
					{:else if cyclesData && cyclesData.items.length > 0}
						{#each cyclesData.items as cycle (cycle.id)}
							<tr class="hover:bg-gray-50 {selectedCycles.includes(cycle.id) ? 'bg-indigo-50/50' : ''}">
								<td class="p-4">
									<input type="checkbox" bind:group={selectedCycles} value={cycle.id} class="rounded border-gray-300 text-indigo-600 focus:ring-indigo-600" />
								</td>
								<td class="p-4 font-medium text-gray-800">
									<div>{cycle.subscriber_details?.name ?? 'N/A'}</div>
									<div class="text-xs text-gray-500">{cycle.subscriber_details?.phone ?? ''}</div>
								</td>
								<td class="p-4 text-sm text-gray-600">
									<div class="font-medium">{cycle.subscriber_details?.unit ?? 'N/A'}</div>
									<div class="text-xs text-gray-500">{cycle.subscriber_details?.center_name ?? 'N/A'}</div>
								</td>
								<td class="p-4 text-sm text-gray-600">
									<div class="font-medium">{cycle.collector_details?.name || cycle.subscriber_details?.expand?.collector?.name || '—'}</div>
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
								<td class="p-4 text-right text-sm">
									<span class="font-mono bg-gray-100 px-2 py-1 rounded">
										Rs. {computedTotal(cycle).toFixed(2)}
									</span>
								</td>
								<td class="p-4 text-right text-sm">
									<span class="font-mono px-2 py-1 text-gray-500">
										Rs. {Number(cycle.coupon_amount || 0).toFixed(2)}
									</span>
								</td>
								<td class="p-4 text-right font-medium text-sm">
									<span class="font-mono bg-indigo-50 text-indigo-700 px-2 py-1 rounded">
										Rs. {(computedTotal(cycle) - Number(cycle.coupon_amount || 0)).toFixed(2)}
									</span>
								</td>
								<td class="p-4 text-sm text-gray-600">
									{formatDate(cycle.start_date)} - {formatDate(cycle.end_date)}
								</td>
								<td class="p-4 text-sm text-gray-600">
									{cycle.last_payment ? formatDate(cycle.last_payment) : (Number(cycle.amount_paid || 0) > 0 ? formatDate(cycle.updated) : 'N/A')}
								</td>
							</tr>
						{/each}
					{:else}
						<tr><td colspan="10" class="p-8 text-center text-gray-500">No payment cycles found.</td></tr>
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

{#if showGenerateModal}
	<BulkGenerateBillsModal
		on:close={() => (showGenerateModal = false)}
		on:success={async (e) => {
			showGenerateModal = false;
			alert(`Successfully generated ${e.detail.count} new bills!`);
			await loadData();
		}}
	/>
{/if}