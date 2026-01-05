<script lang="ts">
	import { onMount } from 'svelte';
	import { createEventDispatcher } from 'svelte';
	import type { Lookups } from '$lib/api/dashboard';
	import { getCityCenters, type CityCenter } from '$lib/api/city_centers';

	export let lookups: Lookups | null = null;
	const dispatch = createEventDispatcher();

	let center = '';
	let date = '';
	let quantity = 0;
	let addedBy = '';
	let allCenters: string[] = [];

	// Default added_by to current user if available (placeholder)
	onMount(async () => {
		date = new Date().toISOString().split('T')[0];
		// TODO: get current user from auth store
		addedBy = 'admin';
		
		// Get all centers from city-centers mapping
		try {
			const cityCenters = await getCityCenters();
			allCenters = cityCenters.flatMap(cc => cc.centers).sort();
		} catch (e) {
			console.error('Failed to load centers:', e);
			// Fallback to lookups if city-centers fails
			allCenters = lookups?.center_names ?? [];
		}
	});

	function handleSubmit() {
		if (!center || !date || quantity <= 0 || !addedBy) {
			alert('Please fill all fields correctly.');
			return;
		}
		dispatch('save', { center, date, quantity, added_by: addedBy });
	}
</script>

<div class="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 flex items-center justify-center p-4">
	<div class="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
		<h3 class="font-bold text-lg mb-4 text-gray-900">Allocate Stock</h3>
		<form on:submit|preventDefault={handleSubmit} class="space-y-4">
			<div>
				<label for="center" class="label">Center</label>
				<select id="center" bind:value={center} required class="input">
					<option value="">Select Center</option>
					{#each allCenters as c}
						<option value={c}>{c}</option>
					{/each}
				</select>
			</div>
			<div>
				<label for="date" class="label">Date</label>
				<input id="date" type="date" bind:value={date} required class="input" />
			</div>
			<div>
				<label for="quantity" class="label">Quantity</label>
				<input id="quantity" type="number" min="0" step="0.01" bind:value={quantity} required class="input" />
			</div>
			<div>
				<label for="addedBy" class="label">Allocated By</label>
				<input id="addedBy" type="text" bind:value={addedBy} required class="input" />
			</div>
			<div class="pt-4 flex justify-end gap-3">
				<button type="button" on:click={() => dispatch('cancel')} class="btn-secondary">
					Cancel
				</button>
				<button type="submit" class="btn-primary">Allocate</button>
			</div>
		</form>
	</div>
</div>

<style>
	@reference '../../../app.css';
	.label {
		@apply block text-sm font-medium leading-6 text-gray-900;
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
