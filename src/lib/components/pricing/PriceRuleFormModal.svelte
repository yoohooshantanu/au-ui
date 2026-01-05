<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import type { PriceRule, PriceScopeType } from '$lib/api/price_rules';
	import { getLookups, type Lookups } from '$lib/api/dashboard';

	export let rule: PriceRule | null = null;

	const dispatch = createEventDispatcher();
	const isEditing = !!rule;

	let date = rule?.date ?? '';
	let scope_type: PriceScopeType = (rule?.scope_type ?? 'unit') as PriceScopeType;
	let scope_value = rule?.scope_value ?? '';
	let price: number = Number(rule?.price ?? 8);
	let is_active: boolean = rule?.is_active ?? true;
	let errorMessage = '';
	let isLoading = false;
	let lookups: Lookups | null = null;
	let lookupError = '';

	$: isDefaultScope = scope_type === 'default';
	$: if (isDefaultScope) scope_value = 'default';

	$: scopeOptions = (() => {
		if (!lookups) return [] as string[];
		if (scope_type === 'unit') return lookups.units ?? [];
		if (scope_type === 'center') return lookups.center_names ?? [];
		if (scope_type === 'city') return lookups.cities ?? [];
		return [];
	})();

	(async () => {
		try {
			lookups = await getLookups();
			lookupError = '';
		} catch (e: any) {
			lookups = { units: [], cities: [], center_names: [], landmarks: [] };
			lookupError = e.message || 'Failed to load lookups';
		}
	})();

	function handleSave() {
		errorMessage = '';
		if (!date) {
			errorMessage = 'Date is required.';
			return;
		}
		if (!isDefaultScope && !scope_value.trim()) {
			errorMessage = 'Scope value is required.';
			return;
		}
		if (Number.isNaN(Number(price)) || Number(price) < 0) {
			errorMessage = 'Please enter a valid price.';
			return;
		}

		dispatch('save', {
			date,
			scope_type,
			scope_value: (isDefaultScope ? 'default' : scope_value.trim()),
			price: Number(price),
			is_active
		});
	}
</script>

<div class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
	<div class="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
		<h3 class="font-bold text-lg mb-4 text-gray-900">{isEditing ? 'Edit' : 'Create'} Price Rule</h3>

		<div class="space-y-4">
			<div>
				<label for="date" class="block text-sm font-medium text-gray-700 mb-1">Date</label>
				<input id="date" type="date" class="block w-full rounded-md border-gray-300 shadow-sm" bind:value={date} />
			</div>
			<div class="grid grid-cols-2 gap-3">
				<div>
					<label for="scope_type" class="block text-sm font-medium text-gray-700 mb-1">Scope</label>
					<select id="scope_type" class="block w-full rounded-md border-gray-300 shadow-sm" bind:value={scope_type}>
						<option value="default">Default</option>
						<option value="unit">Unit</option>
						<option value="center">Center</option>
						<option value="city">City</option>
					</select>
				</div>
				<div>
					<label for="price" class="block text-sm font-medium text-gray-700 mb-1">Daily Price (₹)</label>
					<input id="price" type="number" min="0" class="block w-full rounded-md border-gray-300 shadow-sm" bind:value={price} />
				</div>
			</div>
			<div>
				<label for="scope_value" class="block text-sm font-medium text-gray-700 mb-1">Scope Value</label>
				{#if isDefaultScope}
					<input
						id="scope_value"
						class="block w-full rounded-md border-gray-300 shadow-sm bg-gray-50"
						value="default"
						disabled
					/>
					<p class="text-xs text-gray-500 mt-1">This will set the base daily price from the selected date onward.</p>
				{:else}
					<select id="scope_value" class="block w-full rounded-md border-gray-300 shadow-sm" bind:value={scope_value}>
						<option value="">Select...</option>
						{#each scopeOptions as opt (opt)}
							<option value={opt}>{opt}</option>
						{/each}
					</select>
					<p class="text-xs text-gray-500 mt-1">Value list comes from your Units / Centers / Cities.</p>
					{#if lookupError}
						<p class="text-xs text-gray-500 mt-1">{lookupError}</p>
					{/if}
				{/if}
			</div>
			<div class="flex items-center gap-2">
				<input
					id="active"
					type="checkbox"
					class="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
					bind:checked={is_active}
				/>
				<label for="active" class="text-sm text-gray-700">Active</label>
			</div>
		</div>

		{#if errorMessage}
			<p class="text-sm text-red-600 mt-3">{errorMessage}</p>
		{/if}

		<div class="pt-4 flex justify-end gap-3">
			<button
				on:click={() => dispatch('close')}
				class="rounded-md bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
				disabled={isLoading}
			>
				Cancel
			</button>
			<button
				on:click={handleSave}
				class="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
				disabled={isLoading}
			>
				Save
			</button>
		</div>
	</div>
</div>
