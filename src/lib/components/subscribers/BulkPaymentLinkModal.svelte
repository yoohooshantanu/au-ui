<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { getSubscribers, type Subscriber } from '$lib/api/subscribers';
	import { getPaymentCycles, updatePaymentCycle, type PaymentCycle } from '$lib/api/payment_cycles';
	import { getLookups, type Lookups } from '$lib/api/dashboard';
	
	const dispatch = createEventDispatcher();
	
	let isLoading = false;
	let errorMessage = '';
	let successMessage = '';
	let selectedReaders: Subscriber[] = [];
	let readersWithDuePayments: Array<{
		subscriber: Subscriber;
		dueCycles: PaymentCycle[];
	}> = [];
	let lookups: Lookups | null = null;
	
	// Filter options
	let filters = {
		city: '',
		unit: '',
		center_name: ''
	};
	
	// Reactive: filter centers based on selected city
	$: availableCenters = lookups?.center_names || [];
	
	// Reset center when city changes
	$: if (filters.city && filters.center_name) {
		const cityCenters = lookups?.center_names || [];
		if (!cityCenters.includes(filters.center_name)) {
			filters.center_name = '';
		}
	}
	
	async function loadLookups() {
		try {
			lookups = await getLookups();
		} catch (e: any) {
			console.error('Failed to load lookups:', e);
		}
	}
	
	async function loadReaders() {
		isLoading = true;
		errorMessage = '';
		try {
			// Load readers based on filters
			const readersData = await getSubscribers({
				city: filters.city || undefined,
				unit: filters.unit || undefined,
				center_name: filters.center_name || undefined,
				perPage: 1000
			});

			// Always load due cycles to show amounts in the table
			const dueCycles = await getPaymentCycles({ is_due: true, perPage: 1000 });
			const readerIdsWithDues = new Set(dueCycles.items?.map(c => c.subscriber) || []);

			if (filters.has_due_payment) {
				// Filter readers with due payments
				selectedReaders = readersData.items?.filter(r => readerIdsWithDues.has(r.id)) || [];
			} else {
				selectedReaders = readersData.items || [];
			}

			// Group cycles by subscriber for all selected readers
			readersWithDuePayments = selectedReaders.map(reader => ({
				subscriber: reader,
				dueCycles: dueCycles.items?.filter(c => c.subscriber === reader.id) || []
			}));
			
			successMessage = `Found ${selectedReaders.length} readers matching the filters`;
		} catch (e: any) {
			errorMessage = e.message || 'Failed to load readers';
		} finally {
			isLoading = false;
		}
	}
	
	async function sendBulkPaymentLinks() {
		if (selectedReaders.length === 0) {
			errorMessage = 'No readers selected';
			return;
		}
		
		isLoading = true;
		errorMessage = '';
		successMessage = '';
		
		try {
			let successCount = 0;
			let errorCount = 0;
			
			for (const { subscriber, dueCycles } of readersWithDuePayments) {
				try {
					// Generate payment link for each due cycle
					for (const cycle of dueCycles) {
						const paymentLink = `https://dummy.payment.link/${cycle.subscriber}/${Date.now()}`;
						await updatePaymentCycle(cycle.id, { payment_link: paymentLink });
					}
					successCount++;
				} catch (e: any) {
					errorCount++;
					console.error(`Failed to send payment link for ${subscriber.name}:`, e);
				}
			}
			
			successMessage = `Payment links sent to ${successCount} readers${errorCount > 0 ? ` (${errorCount} failed)` : ''}`;
			
			if (successCount > 0) {
				setTimeout(() => {
					dispatch('success', { count: successCount });
					dispatch('close');
				}, 2000);
			}
			
		} catch (e: any) {
			errorMessage = 'Failed to send payment links: ' + (e.message || 'Unknown error');
		} finally {
			isLoading = false;
		}
	}
	
	function closeModal() {
		dispatch('close');
	}
	
	// Load lookups on component mount
	loadLookups();
</script>

<div class="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 flex items-center justify-center p-4">
	<div class="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-full overflow-y-auto p-6">
		<div class="flex justify-between items-center mb-6">
			<h2 class="text-2xl font-bold text-gray-900">Bulk Send Payment Links</h2>
			<button
				on:click={closeModal}
				class="text-gray-400 hover:text-gray-600 transition-colors"
				aria-label="Close"
			>
				<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
				</svg>
			</button>
		</div>
		
		<!-- Filters -->
		<div class="bg-gray-50 rounded-lg p-4 mb-6">
			<h3 class="font-semibold text-gray-900 mb-3">Filter Readers</h3>
			<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-1">City</label>
					<select
						class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
						bind:value={filters.city}
					>
						<option value="">All Cities</option>
						{#if lookups?.cities}
							{#each lookups.cities as city}
								<option value={city}>{city}</option>
							{/each}
						{/if}
					</select>
				</div>
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-1">Unit</label>
					<select
						class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
						bind:value={filters.unit}
					>
						<option value="">All Units</option>
						{#if lookups?.units}
							{#each lookups.units as unit}
								<option value={unit}>{unit}</option>
							{/each}
						{/if}
					</select>
				</div>
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-1">Center</label>
					<select
						class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
						bind:value={filters.center_name}
						disabled={!filters.city}
					>
						<option value="">{filters.city ? 'Select a center' : 'Select a city first'}</option>
						{#if availableCenters}
							{#each availableCenters as center}
								<option value={center}>{center}</option>
							{/each}
						{/if}
					</select>
				</div>
			</div>
			<div class="mt-4 flex items-center gap-4">
				<label class="flex items-center">
					<input
						type="checkbox"
						class="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
						bind:checked={filters.has_due_payment}
					/>
					<span class="ml-2 text-sm text-gray-700">Only readers with due payments</span>
				</label>
				<button
					on:click={loadReaders}
					disabled={isLoading}
					class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-50"
				>
					{isLoading ? 'Loading...' : 'Search Readers'}
				</button>
			</div>
		</div>
		
		{#if errorMessage}
			<div class="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
				<p class="text-sm text-red-800">{errorMessage}</p>
			</div>
		{/if}
		
		{#if successMessage}
			<div class="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
				<p class="text-sm text-green-800">{successMessage}</p>
			</div>
		{/if}
		
		<!-- Reader List -->
		{#if selectedReaders.length > 0}
			<div class="mb-6">
				<h3 class="font-semibold text-gray-900 mb-3">
					Selected Readers ({selectedReaders.length})
				</h3>
				<div class="max-h-60 overflow-y-auto border border-gray-200 rounded-lg">
					<table class="w-full text-sm">
						<thead class="bg-gray-50 sticky top-0">
							<tr>
								<th class="px-4 py-2 text-left font-medium text-gray-700">Name</th>
								<th class="px-4 py-2 text-left font-medium text-gray-700">Phone</th>
								<th class="px-4 py-2 text-left font-medium text-gray-700">City</th>
								<th class="px-4 py-2 text-left font-medium text-gray-700">Due Amount</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-gray-200">
							{#each readersWithDuePayments as { subscriber, dueCycles }}
								<tr>
									<td class="px-4 py-2">{subscriber.name}</td>
									<td class="px-4 py-2">{subscriber.phone}</td>
									<td class="px-4 py-2">{subscriber.city}</td>
									<td class="px-4 py-2">
										Rs. {dueCycles.reduce((sum, c) => sum + Number(c.amount || 0), 0).toFixed(2)}
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>
		{/if}
		
		<!-- Actions -->
		<div class="flex justify-end gap-3">
			<button
				on:click={closeModal}
				class="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors font-medium"
			>
				Cancel
			</button>
			{#if selectedReaders.length > 0}
				<button
					on:click={sendBulkPaymentLinks}
					disabled={isLoading}
					class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
				>
					{#if isLoading}
						<div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
					{/if}
					Send Payment Links ({selectedReaders.length})
				</button>
			{/if}
		</div>
	</div>
</div>
