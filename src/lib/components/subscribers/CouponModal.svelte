<script lang="ts">
	import { createEventDispatcher, onMount } from 'svelte';
	import { getCoupons, type Coupon } from '$lib/api/coupons';

	export let initialCouponAmount: number = 0;
	const dispatch = createEventDispatcher();

	let coupons: Coupon[] = [];
	let isLoading = true;
	let loadError = '';

	let selectedCouponId: string = '__custom__';
	let couponAmount: number = initialCouponAmount;
	let errorMessage = '';

	onMount(async () => {
		isLoading = true;
		loadError = '';
		try {
			coupons = (await getCoupons()).filter((c) => c.is_active !== false);
			const matched = coupons.find((c) => Number(c.amount) === Number(initialCouponAmount));
			if (matched) selectedCouponId = matched.id;
		} catch (e: any) {
			loadError = e.message || 'Failed to load coupons';
		} finally {
			isLoading = false;
		}
	});

	$: {
		if (selectedCouponId && selectedCouponId !== '__custom__') {
			const selected = coupons.find((c) => c.id === selectedCouponId);
			if (selected) couponAmount = Number(selected.amount);
		}
	}

	function handleSave() {
		errorMessage = '';
		if (couponAmount === null || couponAmount === undefined) {
			errorMessage = 'Coupon amount is required.';
			return;
		}
		if (Number.isNaN(Number(couponAmount)) || Number(couponAmount) < 0) {
			errorMessage = 'Please enter a valid coupon amount.';
			return;
		}
		dispatch('save', Number(couponAmount));
	}
</script>

<div class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
	<div class="bg-white rounded-lg shadow-xl w-full max-w-sm p-6">
		<h3 class="font-bold text-lg mb-4 text-gray-900">Add Coupon</h3>

		<div class="mb-4">
			<label for="coupon_select" class="block text-sm font-medium text-gray-700 mb-1">Coupon Category</label>
			<select
				id="coupon_select"
				class="block w-full rounded-md border-gray-300 shadow-sm"
				bind:value={selectedCouponId}
				disabled={isLoading}
			>
				<option value="__custom__">Custom</option>
				{#each coupons as c (c.id)}
					<option value={c.id}>{c.name} (₹{Number(c.amount || 0)})</option>
				{/each}
			</select>
			{#if loadError}
				<p class="text-xs text-red-600 mt-1">{loadError}</p>
			{/if}
			<p class="text-xs text-gray-500 mt-1">Manage coupons from <code class="font-mono">/coupons</code>.</p>
		</div>

		<div class="mb-4">
			<label for="coupon" class="block text-sm font-medium text-gray-700 mb-1">Coupon Amount (₹)</label>
			<input
				type="number"
				id="coupon"
				class="block w-full rounded-md border-gray-300 shadow-sm"
				bind:value={couponAmount}
				min="0"
				disabled={selectedCouponId !== '__custom__'}
			/>
		</div>

		{#if errorMessage}
			<p class="text-sm text-red-600">{errorMessage}</p>
		{/if}

		<div class="pt-4 flex justify-end gap-3">
			<button
				on:click={() => dispatch('close')}
				class="rounded-md bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
			>
				Cancel
			</button>
			<button
				on:click={handleSave}
				class="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
			>
				Save
			</button>
		</div>
	</div>
</div>
