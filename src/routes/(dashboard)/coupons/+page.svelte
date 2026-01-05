<script lang="ts">
	import { onMount } from 'svelte';
	import { createCoupon, deleteCoupon, getCoupons, updateCoupon, type Coupon } from '$lib/api/coupons';
	import CouponFormModal from '$lib/components/coupons/CouponFormModal.svelte';

	let coupons: Coupon[] = [];
	let isLoading = true;
	let error: string | null = null;
	let showForm = false;
	let selectedCoupon: Coupon | null = null;

	async function loadCoupons() {
		isLoading = true;
		error = null;
		try {
			coupons = await getCoupons();
		} catch (e: any) {
			error = e.message || 'Failed to load coupons';
		} finally {
			isLoading = false;
		}
	}

	onMount(loadCoupons);

	function handleAdd() {
		selectedCoupon = null;
		showForm = true;
	}

	function handleEdit(coupon: Coupon) {
		selectedCoupon = coupon;
		showForm = true;
	}

	async function handleDelete(id: string) {
		if (!confirm('Are you sure? This cannot be undone.')) return;
		try {
			await deleteCoupon(id);
			await loadCoupons();
		} catch (e: any) {
			alert(e.message || 'Failed to delete coupon');
		}
	}

	async function handleSave(event: CustomEvent<{ name: string; amount: number; is_active: boolean }>) {
		try {
			if (selectedCoupon?.id) {
				await updateCoupon(selectedCoupon.id, event.detail);
			} else {
				await createCoupon(event.detail);
			}
			showForm = false;
			await loadCoupons();
		} catch (e: any) {
			alert(e.message || 'Failed to save coupon');
		}
	}
</script>

<div class="space-y-4">
	<div class="flex justify-between items-center">
		<div>
			<h1 class="text-3xl font-bold text-gray-900">Coupons</h1>
			<p class="text-gray-600 mt-1">Create coupons (category + amount) and use them from Payment Due.</p>
		</div>
		<button on:click={handleAdd} class="btn-primary">Add Coupon</button>
	</div>

	<div class="bg-white rounded-lg shadow-sm overflow-hidden">
		<div class="overflow-x-auto">
			<table class="w-full min-w-[700px] text-sm">
				<thead class="bg-gray-50">
					<tr>
						<th class="th">Name</th>
						<th class="th text-right">Amount</th>
						<th class="th text-center">Active</th>
						<th class="th text-right">Actions</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-gray-200">
					{#if isLoading}
						<tr><td colspan="4" class="p-6 text-center text-gray-500">Loading...</td></tr>
					{:else if error}
						<tr><td colspan="4" class="p-6 text-center text-red-600">{error}</td></tr>
					{:else if coupons.length === 0}
						<tr><td colspan="4" class="p-6 text-center text-gray-500">No coupons found.</td></tr>
					{:else}
						{#each coupons as c (c.id)}
							<tr>
								<td class="td font-medium text-gray-900">{c.name}</td>
								<td class="td text-right font-mono">₹{Number(c.amount || 0).toFixed(2)}</td>
								<td class="td text-center">{c.is_active === false ? 'No' : 'Yes'}</td>
								<td class="td text-right">
									<div class="flex justify-end gap-2">
										<button class="btn-action" on:click={() => handleEdit(c)}>Edit</button>
										<button class="btn-action-destructive" on:click={() => handleDelete(c.id)}>Delete</button>
									</div>
								</td>
							</tr>
						{/each}
					{/if}
				</tbody>
			</table>
		</div>
	</div>
</div>

{#if showForm}
	<CouponFormModal coupon={selectedCoupon} on:close={() => (showForm = false)} on:save={handleSave} />
{/if}

<style>
	@reference '../../../app.css';
	.btn-primary {
		@apply rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500;
	}
	.th {
		@apply p-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider;
	}
	.td {
		@apply p-4;
	}
	.btn-action {
		@apply rounded bg-white px-2 py-1 text-xs font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50;
	}
	.btn-action-destructive {
		@apply rounded bg-red-50 px-2 py-1 text-xs font-semibold text-red-700 shadow-sm ring-1 ring-inset ring-red-200 hover:bg-red-100;
	}
</style>
