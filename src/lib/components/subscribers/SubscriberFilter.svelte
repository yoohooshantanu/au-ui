<script lang="ts">
	import type { Lookups } from '$lib/api/dashboard';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';

	export let lookups: Lookups;

	// State for all filters, initialized from URL
	let search = $page.url.searchParams.get('search') ?? '';
	let unit = $page.url.searchParams.get('unit') ?? '';
	let city = $page.url.searchParams.get('city') ?? '';
	let pincode = $page.url.searchParams.get('pincode') ?? '';
	// --- NEW ---
	let center_name = $page.url.searchParams.get('center_name') ?? '';
	let landmark = $page.url.searchParams.get('landmark') ?? '';
	// --- END NEW ---
	let has_due_payment = $page.url.searchParams.get('has_due_payment') === 'true';

	// Client-side validation for pincode
	$: isPincodeValid = /^\d{6}$/.test(pincode) || pincode === '';

	// Create a mapping of cities to their centers
	$: cityCenters = {};
	if (lookups?.cities && lookups?.center_names) {
		// This would ideally come from the API, but for now we'll need to derive it
		// Since we don't have the city-center mapping, we'll show all centers when no city is selected
		// and filter when we implement the API endpoint
		cityCenters = {};
	}

	// Filter centers based on selected city
	$: availableCenters = city ? lookups?.center_names || [] : lookups?.center_names || [];

	// Reset center when city changes
	$: if (city && center_name && !availableCenters.includes(center_name)) {
		center_name = '';
	}

	function applyFilters() {
		if (!isPincodeValid) {
			alert('Please enter a valid 6-digit pincode.');
			return;
		}
		const query = new URLSearchParams();
		if (search) query.set('search', search);
		if (unit) query.set('unit', unit);
		if (city) query.set('city', city);
		if (pincode) query.set('pincode', pincode);
		// --- NEW ---
		if (center_name) query.set('center_name', center_name);
		if (landmark) query.set('landmark', landmark);
		// --- END NEW ---
		if (has_due_payment) query.set('has_due_payment', 'true');
		query.set('page', '1');

		goto(`/dashboard/subscribers?${query.toString()}`, { keepFocus: true, noScroll: true });
	}

	function resetFilters() {
		search = '';
		unit = '';
		city = '';
		pincode = '';
		// --- NEW ---
		center_name = '';
		landmark = '';
		// --- END NEW ---
		has_due_payment = false;
		goto('/dashboard/subscribers', { keepFocus: true, noScroll: true });
	}
</script>

<div class="bg-white p-4 sm:p-5 rounded-lg shadow-sm mb-6 border border-gray-200">
	<form on:submit|preventDefault={applyFilters}>
		<!-- Main Filter Grid - UPDATED to handle 6 items -->
		<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-x-6 gap-y-5">
			<!-- Search Input - UPDATED to span 2 columns on larger screens -->
			<div class="sm:col-span-2 lg:col-span-2">
				<label for="search" class="label">Search</label>
				<!-- UPDATED placeholder text -->
				<input
					type="text"
					id="search"
					bind:value={search}
					placeholder="Name, phone, center, landmark..."
					class="input"
				/>
			</div>

			<!-- Unit Dropdown -->
			<div>
				<label for="unit" class="label">Unit</label>
				<select id="unit" bind:value={unit} class="input">
					<option value="">All Units</option>
					{#if lookups?.units}
						{#each lookups.units as u}
							<option value={u}>{u}</option>
						{/each}
					{/if}
				</select>
			</div>

			<!-- City Dropdown -->
			<div>
				<label for="city" class="label">City</label>
				<select id="city" bind:value={city} class="input">
					<option value="">All Cities</option>
					{#if lookups?.cities}
						{#each lookups.cities as c}
							<option value={c}>{c}</option>
						{/each}
					{/if}
				</select>
			</div>

			<!-- --- NEW: Center Name Dropdown --- -->
			<div>
				<label for="center_name" class="label">Center Name</label>
				<select id="center_name" bind:value={center_name} class="input" disabled={!city}>
					<option value="">{city ? 'Select a center' : 'Select a city first'}</option>
					{#if availableCenters}
						{#each availableCenters as c}
							<option value={c}>{c}</option>
						{/each}
					{/if}
				</select>
			</div>

			<!-- --- NEW: Landmark Dropdown --- -->
			<div>
				<label for="landmark" class="label">Landmark</label>
				<select id="landmark" bind:value={landmark} class="input">
					<option value="">All Landmarks</option>
					{#if lookups?.landmarks}
						{#each lookups.landmarks as l}
							<option value={l}>{l}</option>
						{/each}
					{/if}
				</select>
			</div>

			<!-- Pincode Input (Visually Smaller) - MOVED TO THE END for better layout flow -->
			<!-- <div>
				<label for="pincode" class="label">Pincode</label>
				<input
					type="text"
					id="pincode"
					bind:value={pincode}
					placeholder="6-digit code"
					class="input max-w-[180px]"
					class:!ring-red-500={!isPincodeValid}
					maxlength="6"
				/>
			</div> -->
		</div>

		<!-- Lower Section with Toggle and Buttons -->
		<div class="flex flex-wrap justify-between items-center pt-5 mt-5 border-t border-gray-200">
			<!-- "Has Due Payments" Toggle Switch -->
			<label for="due-payments" class="flex items-center cursor-pointer">
				<div class="relative">
					<input type="checkbox" id="due-payments" class="sr-only" bind:checked={has_due_payment} />
					<div
						class="block w-10 h-6 rounded-full transition-colors"
						class:bg-indigo-600={has_due_payment}
						class:bg-gray-200={!has_due_payment}
					></div>
					<div
						class="dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform"
						class:translate-x-4={has_due_payment}
					></div>
				</div>
				<div class="ml-3 text-sm font-medium text-gray-900">Show only with due payments</div>
			</label>

			<!-- Action Buttons -->
			<div class="flex items-center gap-3 mt-4 sm:mt-0">
				<button type="button" on:click={resetFilters} class="btn-secondary"> Reset All </button>
				<button type="submit" class="btn-primary"> Apply Filters </button>
			</div>
		</div>
	</form>
</div>

<style>
	@reference '../../../app.css';

	.label {
		@apply block text-sm font-medium leading-6 text-gray-900 mb-1;
	}
	.input {
		@apply block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6;
	}
	.btn-primary {
		@apply rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500;
	}
	.btn-secondary {
		@apply rounded-md bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50;
	}
</style>