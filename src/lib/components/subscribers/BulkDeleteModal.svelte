<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { getSubscribers, type Subscriber } from '$lib/api/subscribers';
	import { deleteSubscriber } from '$lib/api/subscribers';
	import { getLookups, type Lookups } from '$lib/api/dashboard';
	
	const dispatch = createEventDispatcher();
	
	let isLoading = false;
	let errorMessage = '';
	let successMessage = '';
	let selectedReaders: Subscriber[] = [];
	let lookups: Lookups | null = null;
	let confirmText = '';
	
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
			
			selectedReaders = readersData.items || [];
			successMessage = `Found ${selectedReaders.length} readers matching the filters`;
		} catch (e: any) {
			errorMessage = e.message || 'Failed to load readers';
		} finally {
			isLoading = false;
		}
	}
	
	async function deleteBulkReaders() {
		if (selectedReaders.length === 0) {
			errorMessage = 'No readers selected';
			return;
		}
		
		if (confirmText !== 'DELETE') {
			errorMessage = 'Please type DELETE to confirm';
			return;
		}
		
		isLoading = true;
		errorMessage = '';
		successMessage = '';
		
		try {
			let successCount = 0;
			let errorCount = 0;
			
			for (const reader of selectedReaders) {
				try {
					await deleteSubscriber(reader.id);
					successCount++;
				} catch (e: any) {
					errorCount++;
					console.error(`Failed to delete ${reader.name}:`, e);
				}
			}
			
			successMessage = `Successfully deleted ${successCount} readers${errorCount > 0 ? ` (${errorCount} failed)` : ''}`;
			
			if (successCount > 0) {
				setTimeout(() => {
					dispatch('success', { count: successCount });
					dispatch('close');
				}, 2000);
			}
			
		} catch (e: any) {
			errorMessage = 'Failed to delete readers: ' + (e.message || 'Unknown error');
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
			<h2 class="text-2xl font-bold text-gray-900">Bulk Delete Readers</h2>
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
		
		<!-- Warning Message -->
		<div class="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
			<div class="flex items-start">
				<div class="flex-shrink-0">
					<svg class="h-6 w-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
					</svg>
				</div>
				<div class="ml-3">
					<h3 class="text-sm font-medium text-red-800">Warning: This action cannot be undone!</h3>
					<div class="mt-2 text-sm text-red-700">
						<p>Deleting readers will permanently remove all their data including:</p>
						<ul class="list-disc list-inside mt-1">
							<li>Personal information and contact details</li>
							<li>Payment history and cycles</li>
							<li>Daily tracking records</li>
							<li>Missed delivery records</li>
						</ul>
					</div>
				</div>
			</div>
		</div>
		
		<!-- Filters -->
		<div class="bg-gray-50 rounded-lg p-4 mb-6">
			<h3 class="font-semibold text-gray-900 mb-3">Filter Readers to Delete</h3>
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
						{#if filters.city && availableCenters}
							{#each availableCenters as center}
								<option value={center}>{center}</option>
							{/each}
						{/if}
					</select>
				</div>
			</div>
			<div class="mt-4">
				<button
					on:click={loadReaders}
					disabled={isLoading}
					class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-50"
				>
					{isLoading ? 'Loading...' : 'Search Readers'}
				</button>
			</div>
		</div>
		
		<!-- Results -->
		{#if successMessage}
			<div class="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
				<p class="text-sm text-green-800">{successMessage}</p>
			</div>
		{/if}
		
		{#if errorMessage}
			<div class="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
				<p class="text-sm text-red-800">{errorMessage}</p>
			</div>
		{/if}
		
		{#if selectedReaders.length > 0}
			<div class="mb-6">
				<h3 class="font-semibold text-gray-900 mb-3">
					Readers to be Deleted ({selectedReaders.length})
				</h3>
				<div class="max-h-60 overflow-y-auto border border-gray-200 rounded-lg">
					<table class="min-w-full divide-y divide-gray-200">
						<thead class="bg-gray-50 sticky top-0">
							<tr>
								<th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
								<th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
								<th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">City</th>
								<th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Unit</th>
								<th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Center</th>
							</tr>
						</thead>
						<tbody class="bg-white divide-y divide-gray-200">
							{#each selectedReaders as reader}
								<tr class="hover:bg-gray-50">
									<td class="px-4 py-2 text-sm text-gray-900">{reader.name}</td>
									<td class="px-4 py-2 text-sm text-gray-900">{reader.phone}</td>
									<td class="px-4 py-2 text-sm text-gray-900">{reader.city}</td>
									<td class="px-4 py-2 text-sm text-gray-900">{reader.unit}</td>
									<td class="px-4 py-2 text-sm text-gray-900">{reader.center_name}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>
			
			<!-- Confirmation -->
			<div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
				<h3 class="font-medium text-yellow-800 mb-2">Final Confirmation</h3>
				<p class="text-sm text-yellow-700 mb-3">
					To confirm deletion, please type <strong>DELETE</strong> in the box below:
				</p>
				<input
					type="text"
					class="w-full px-3 py-2 border border-yellow-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
					bind:value={confirmText}
					placeholder="Type DELETE to confirm"
				/>
			</div>
			
			<!-- Action Buttons -->
			<div class="flex justify-end gap-3">
				<button
					type="button"
					on:click={closeModal}
					class="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
				>
					Cancel
				</button>
				<button
					on:click={deleteBulkReaders}
					disabled={isLoading || confirmText !== 'DELETE'}
					class="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
				>
					{isLoading ? 'Deleting...' : `Delete ${selectedReaders.length} Readers`}
				</button>
			</div>
		{/if}
	</div>
</div>
