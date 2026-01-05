<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import type { Coupon } from '$lib/api/coupons';

	export let coupon: Coupon | null = null;

	const dispatch = createEventDispatcher();
	const isEditing = !!coupon;

	let name = coupon?.name ?? '';
	let amount: number = Number(coupon?.amount ?? 0);
	let isActive: boolean = coupon?.is_active ?? true;
	let errorMessage = '';
	let isLoading = false;

	function handleSave() {
		errorMessage = '';
		if (!name.trim()) {
			errorMessage = 'Name is required.';
			return;
		}
		if (Number.isNaN(Number(amount)) || Number(amount) < 0) {
			errorMessage = 'Please enter a valid amount.';
			return;
		}
		dispatch('save', { name: name.trim(), amount: Number(amount), is_active: isActive });
	}
</script>

<div class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
	<div class="bg-white rounded-lg shadow-xl w-full max-w-sm p-6">
		<h3 class="font-bold text-lg mb-4 text-gray-900">{isEditing ? 'Edit Coupon' : 'Create Coupon'}</h3>

		<div class="space-y-4">
			<div>
				<label for="name" class="block text-sm font-medium text-gray-700 mb-1">Category / Name</label>
				<input id="name" class="block w-full rounded-md border-gray-300 shadow-sm" bind:value={name} />
			</div>
			<div>
				<label for="amount" class="block text-sm font-medium text-gray-700 mb-1">Amount (₹)</label>
				<input
					id="amount"
					type="number"
					min="0"
					class="block w-full rounded-md border-gray-300 shadow-sm"
					bind:value={amount}
				/>
			</div>
			<div class="flex items-center gap-2">
				<input
					id="active"
					type="checkbox"
					class="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
					bind:checked={isActive}
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
