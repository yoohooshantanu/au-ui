<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { getSubscribers, type Subscriber } from '$lib/api/subscribers';
	import { getPaymentCycles, createPaymentCycle, type PaymentCycle } from '$lib/api/payment_cycles';
	import { getLookups, type Lookups } from '$lib/api/dashboard';
	import { getPocUsers } from '$lib/api/poc';
	import { listPriceRules, type PriceRule } from '$lib/api/price_rules';
	import { computeCycleTotal, DEFAULT_DAILY_PRICE, toYmd } from '$lib/utils/pricing';
	
	const dispatch = createEventDispatcher();
	
	let isLoading = false;
	let errorMessage = '';
	let successMessage = '';
	
	interface ReaderWithCycle {
		subscriber: Subscriber;
		latestCycle?: PaymentCycle;
		newStartDate: Date;
		newStartDate: Date;
		newEndDate: Date;
		computedAmount: number;
		centerToPocId?: Map<string, string>;
	}
	
	let availableReaders: ReaderWithCycle[] = [];
	let checkedReaderIds: string[] = [];
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
	
	function formatDate(date: Date) {
		return date.toLocaleDateString("en-US", {
			month: "short",
			day: "numeric",
			year: "numeric",
		});
	}
	
	async function loadReaders() {
		isLoading = true;
		errorMessage = '';
		availableReaders = [];
		checkedReaderIds = [];
		successMessage = '';
		let centerToPocId = new Map<string, string>();
		try {
			// 0. Load POCs to map centers to executives
			try {
				const pocs = await getPocUsers();
				for (const poc of pocs) {
					if (poc.centers && poc.id) {
						for (const c of poc.centers) {
							centerToPocId.set(c, poc.id);
						}
					}
				}
			} catch(e) {
				console.error("Failed to load POC users:", e);
			}

			// 1. Load running subscribers matching filters
			let allSubscribers: Subscriber[] = [];
			let pg = 1;
			while (true) {
				const readersData = await getSubscribers({
					page: pg,
					perPage: 500,
					city: filters.city || undefined,
					unit: filters.unit || undefined,
					center_name: filters.center_name || undefined,
					status: 'running' // Only generate bills for running subscribers
				});
				allSubscribers = [...allSubscribers, ...(readersData.items || [])];
				if (pg >= (readersData.totalPages || 1)) break;
				pg++;
			}
			
			// 2. Load all payment cycles
			let allCycles: PaymentCycle[] = [];
			let cPg = 1;
			while (true) {
				const cyclesData = await getPaymentCycles({
					page: cPg,
					perPage: 500
				});
				allCycles = [...allCycles, ...(cyclesData.items || [])];
				if (cPg >= (cyclesData.totalPages || 1)) break;
				cPg++;
			}
			
			// Group cycles by subscriber ID
			const cyclesBySubscriber = new Map<string, PaymentCycle[]>();
			for (const cycle of allCycles) {
				if (!cyclesBySubscriber.has(cycle.subscriber)) {
					cyclesBySubscriber.set(cycle.subscriber, []);
				}
				cyclesBySubscriber.get(cycle.subscriber)!.push(cycle);
			}
			
			const today = new Date();
			today.setHours(0, 0, 0, 0);
			
			let rules: PriceRule[] = [];
			try {
				rules = await listPriceRules();
			} catch(e) {
				rules = [];
			}
			
			const readersNeedingBills: ReaderWithCycle[] = [];
			
			for (const sub of allSubscribers) {
				const subCycles = cyclesBySubscriber.get(sub.id);
				
				let newStartDate: Date;
				let newEndDate: Date;
				let latestCycleToPass: PaymentCycle | undefined;
				
				if (!subCycles || subCycles.length === 0) {
					// No previous cycles exist, create their very first cycle
					if (sub.start_date) {
						newStartDate = new Date(sub.start_date.split(' ')[0].split('T')[0]);
					} else if (sub.created) {
						newStartDate = new Date(sub.created.split(' ')[0].split('T')[0]);
					} else {
						newStartDate = new Date(today.getFullYear(), today.getMonth(), 1);
					}
					newEndDate = new Date(newStartDate.getFullYear(), newStartDate.getMonth() + 1, 0);
				} else {
					// Find the most recent cycle based on end_date
					subCycles.sort((a, b) => new Date(b.end_date).getTime() - new Date(a.end_date).getTime());
					const latestCycle = subCycles[0];
					latestCycleToPass = latestCycle;
					
					const lastEndDate = new Date(latestCycle.end_date);
					lastEndDate.setHours(0, 0, 0, 0);
					
					// If the latest cycle's end date is in the future, they don't need a new bill
					if (lastEndDate > today) continue;
					
					newStartDate = new Date(latestCycle.end_date);
					// start date is 1 day after previous end date
					newStartDate.setDate(newStartDate.getDate() + 1);
					
					// end date is the last day of new start date's month
					newEndDate = new Date(newStartDate.getFullYear(), newStartDate.getMonth() + 1, 0);
				}
				
				let computedAmount = 500; // default safe fallback
				try {
					computedAmount = computeCycleTotal({
						subscriber: sub,
						startYmd: toYmd(newStartDate),
						endYmd: toYmd(newEndDate),
						rules,
						defaultPrice: DEFAULT_DAILY_PRICE
					});
				} catch(e) {
					// fallback to previous cycle amount if pricing fails
					if (latestCycleToPass?.amount) computedAmount = Number(latestCycleToPass.amount);
				}
				
				readersNeedingBills.push({
					subscriber: sub,
					latestCycle: latestCycleToPass,
					newStartDate,
					newEndDate,
					computedAmount,
					centerToPocId
				});
			}
			
			availableReaders = readersNeedingBills;
			checkedReaderIds = readersNeedingBills.map(r => r.subscriber.id);
			
			successMessage = `Found ${availableReaders.length} running readers who need new bills generated`;
		} catch (e: any) {
			errorMessage = e.message || 'Failed to load readers';
		} finally {
			isLoading = false;
		}
	}
	
	async function generateBulkBills() {
		if (checkedReaderIds.length === 0) {
			errorMessage = 'No readers selected';
			return;
		}
		
		isLoading = true;
		errorMessage = '';
		successMessage = '';
		
		try {
			let successCount = 0;
			let errorCount = 0;
			
			const readersToProcess = availableReaders.filter(rp => checkedReaderIds.includes(rp.subscriber.id));
			
			for (const readerData of readersToProcess) {
				try {
					await createPaymentCycle({
						subscriber: readerData.subscriber.id,
						start_date: readerData.newStartDate.toISOString(),
						end_date: readerData.newEndDate.toISOString(),
						amount: readerData.computedAmount,
						coupon_amount: 0,
						product_code: readerData.latestCycle?.product_code || '',
						is_due: true,
						collected_by: readerData.centerToPocId?.get(readerData.subscriber.center_name || '') || undefined
					});
					successCount++;
				} catch (e: any) {
					errorCount++;
					console.error(`Failed to generate bill for ${readerData.subscriber.name}:`, e);
				}
			}
			
			successMessage = `Generated bills for ${successCount} readers${errorCount > 0 ? ` (${errorCount} failed)` : ''}`;
			
			if (successCount > 0) {
				setTimeout(() => {
					dispatch('success', { count: successCount });
					dispatch('close');
				}, 2000);
			}
			
		} catch (e: any) {
			errorMessage = 'Failed to generate bills: ' + (e.message || 'Unknown error');
		} finally {
			isLoading = false;
		}
	}
	
	function toggleAllReaders() {
		if (checkedReaderIds.length === availableReaders.length) {
			checkedReaderIds = [];
		} else {
			checkedReaderIds = availableReaders.map(r => r.subscriber.id);
		}
	}

	function closeModal() {
		dispatch('close');
	}
	
	// Load lookups on component mount
	loadLookups();
</script>

<div class="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 flex items-center justify-center p-4">
	<div class="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-full overflow-y-auto p-6">
		<div class="flex justify-between items-center mb-6">
			<div>
				<h2 class="text-2xl font-bold text-gray-900">Bulk Generate Bills</h2>
				<p class="text-sm text-gray-500 mt-1">Automatically generates the next payment cycle for running readers whose previous cycle has ended, and first bill for new readers.</p>
			</div>
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
			<div class="mt-4 flex justify-end">
				<button
					on:click={loadReaders}
					disabled={isLoading}
					class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-2"
				>
					{#if isLoading}
						<div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
					{/if}
					{isLoading ? 'Scanning Subscribers...' : 'Find Readers Needing Bills'}
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
		
		<!-- Reader List Preview -->
		{#if availableReaders.length > 0}
			<div class="mb-6">
				<div class="flex justify-between items-center mb-3">
					<h3 class="font-semibold text-gray-900">
						Preview Next Bills ({checkedReaderIds.length} / {availableReaders.length} selected)
					</h3>
					<button on:click={toggleAllReaders} class="text-sm text-indigo-600 hover:text-indigo-800 font-medium">
						{checkedReaderIds.length === availableReaders.length ? 'Deselect All' : 'Select All'}
					</button>
				</div>
				<div class="max-h-60 overflow-y-auto border border-gray-200 rounded-lg">
					<table class="w-full text-sm">
						<thead class="bg-gray-50 sticky top-0 z-10">
							<tr>
								<th class="px-4 py-2 text-left font-medium text-gray-700 w-12 border-b border-gray-200">
									<input 
										type="checkbox" 
										class="rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
										checked={checkedReaderIds.length === availableReaders.length && availableReaders.length > 0}
										on:change={toggleAllReaders}
									>
								</th>
								<th class="px-4 py-2 text-left font-medium text-gray-700 border-b border-gray-200">Name</th>
								<th class="px-4 py-2 text-left font-medium text-gray-700 border-b border-gray-200">Phone</th>
								<th class="px-4 py-2 text-left font-medium text-gray-700 border-b border-gray-200">New Bill Period</th>
								<th class="px-4 py-2 text-left font-medium text-gray-700 border-b border-gray-200">Amount</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-gray-200">
							{#each availableReaders as readerData}
								<tr class="hover:bg-gray-50 cursor-pointer" on:click={() => {
									if (checkedReaderIds.includes(readerData.subscriber.id)) {
										checkedReaderIds = checkedReaderIds.filter(id => id !== readerData.subscriber.id);
									} else {
										checkedReaderIds = [...checkedReaderIds, readerData.subscriber.id];
									}
								}}>
									<td class="px-4 py-2" on:click|stopPropagation>
										<input 
											type="checkbox" 
											class="rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
											value={readerData.subscriber.id} 
											bind:group={checkedReaderIds} 
										>
									</td>
									<td class="px-4 py-2">{readerData.subscriber.name}</td>
									<td class="px-4 py-2">{readerData.subscriber.phone}</td>
									<td class="px-4 py-2 font-medium text-indigo-700">
										{formatDate(readerData.newStartDate)} to {formatDate(readerData.newEndDate)}
									</td>
									<td class="px-4 py-2 text-indigo-700 font-semibold">Rs. {readerData.computedAmount.toFixed(2)}</td>
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
			{#if availableReaders.length > 0}
				<button
					on:click={generateBulkBills}
					disabled={isLoading || checkedReaderIds.length === 0}
					class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
				>
					{#if isLoading}
						<div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
					{/if}
					Generate {checkedReaderIds.length} Bills
				</button>
			{/if}
		</div>
	</div>
</div>
