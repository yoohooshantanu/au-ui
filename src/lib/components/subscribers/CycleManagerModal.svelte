<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { createPaymentCycle, updatePaymentCycle, type PaymentCycle } from '$lib/api/payment_cycles';

	export let subscriberId: string;
	export let cycle: PaymentCycle | null = null; // null for new, object for edit

	const dispatch = createEventDispatcher();
	const isEditing = !!cycle;

	// This logic correctly handles the possibility of `cycle` being null
	let formData: Partial<PaymentCycle> = cycle
		? {
				...cycle,
				start_date: cycle.start_date ? cycle.start_date.split('T')[0] : '',
				end_date: cycle.end_date ? cycle.end_date.split('T')[0] : '',
				last_payment: cycle.last_payment ? cycle.last_payment.split('T')[0] : ''
		  }
		: { subscriber: subscriberId, amount: 500, is_due: true };

	let isLoading = false;
	let errorMessage = '';

	async function handleSubmit() {
		isLoading = true;
		errorMessage = '';
		try {
			const payload = {
				...formData,
				start_date: formData.start_date ? new Date(formData.start_date).toISOString() : undefined,
				end_date: formData.end_date ? new Date(formData.end_date).toISOString() : undefined,
				last_payment: formData.last_payment ? new Date(formData.last_payment).toISOString() : null,
				// coupon_amount is optional; ensure numeric value or 0
				coupon_amount: formData.coupon_amount ? Number(formData.coupon_amount) : 0
			};
			if (isEditing && cycle) {
				await updatePaymentCycle(cycle.id, payload);
			} else {
				await createPaymentCycle(payload);
			}
			dispatch('success');
		} catch (e: any) {
			errorMessage = e.message;
		} finally {
			isLoading = false;
		}
	}
</script>

<div class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
	<div class="bg-white rounded-lg shadow-xl w-full max-w-lg p-6">
		<h3 class="font-bold text-lg mb-4 text-gray-900">{isEditing ? 'Edit' : 'Create'} Payment Cycle</h3>
		<form on:submit|preventDefault={handleSubmit} class="space-y-4">
			<div class="grid grid-cols-2 gap-x-6 gap-y-4">
				<div>
					<label for="start_date" class="label">Start Date</label>
					<input type="date" id="start_date" class="input" bind:value={formData.start_date} required />
				</div>
				<div>
					<label for="end_date" class="label">End Date</label>
					<input type="date" id="end_date" class="input" bind:value={formData.end_date} />
				</div>
				<div>
					<label for="amount" class="label">Amount (Rs.)</label>
					<input type="number" id="amount" class="input" bind:value={formData.amount} required />
				</div>
				<div>
					<label for="coupon_amount" class="label">Coupon Amount (Rs.)</label>
					<input type="number" id="coupon_amount" class="input" bind:value={formData.coupon_amount} min="0" />
				</div>
				<div>
					<label for="product_code" class="label">Product Code</label>
					<input type="text" id="product_code" class="input" bind:value={formData.product_code} />
				</div>
				<div class="col-span-2">
					<label for="last_payment" class="label">Last Payment Date (if paid)</label>
					<input type="date" id="last_payment" class="input" bind:value={formData.last_payment} />
				</div>
				<div class="col-span-2">
					<div class="relative flex items-start">
						<div class="flex h-6 items-center">
							<input
								id="is_due"
								type="checkbox"
								class="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
								bind:checked={formData.is_due}
							/>
						</div>
						<div class="ml-3 text-sm">
							<label for="is_due" class="font-medium text-gray-900"
								>Is this payment still due?</label
							>
						</div>
					</div>
				</div>
			</div>

			<!-- Preview final amount after coupon -->
			<div>
				<label class="label">Final Amount</label>
				<div class="text-lg font-mono">Rs. {(Number(formData.amount || 0) - Number(formData.coupon_amount || 0)).toFixed(2)}</div>
			</div>

			{#if errorMessage}
				<p class="text-sm text-red-600">{errorMessage}</p>
			{/if}

			<!-- ======== CORRECTED ACTION BUTTONS ======== -->
			<div class="pt-4 flex justify-end gap-3">
				<button type="button" on:click={() => dispatch('close')} class="btn-secondary">Cancel</button>
				<button type="submit" class="btn-primary" disabled={isLoading}>
					<!-- Simple, clean text that changes based on loading state -->
					{isLoading ? 'Saving...' : 'Save Cycle'}
				</button>
			</div>
		</form>
	</div>
</div>

<style>
	@reference '../../../app.css';

	.label {
		@apply block text-sm font-medium leading-6 text-gray-900;
	}
	/* Using the @tailwindcss/forms plugin for this style */
	.input {
		@apply block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6;
	}
	.btn-primary {
		@apply rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50;
	}
	.btn-secondary {
		@apply rounded-md bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50;
	}
</style>