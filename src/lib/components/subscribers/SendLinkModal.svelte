<script lang="ts">
	import { createEventDispatcher, onMount } from 'svelte';
	import { getSubscriberById, type Subscriber } from '$lib/api/subscribers';
	import { updatePaymentCycle, type PaymentCycle } from '$lib/api/payment_cycles';
	import { listPriceRules, type PriceRule } from '$lib/api/price_rules';
	import { computeCycleTotal } from '$lib/utils/pricing';
	
	export let cycle: PaymentCycle;
	const dispatch = createEventDispatcher();

	let subscriber: Subscriber | null = null;
	let priceRules: PriceRule[] = [];
	let pricingError = '';
	let baseAmount = Number(cycle.amount || 0) - Number(cycle.coupon_amount || 0);
	let amount = baseAmount;
	let isLoading = false;
	let errorMessage = '';

	function ymdFromIso(iso: string) {
		if (!iso) return '';
		if (iso.includes('T')) return iso.split('T')[0];
		// Assume already YYYY-MM-DD
		return iso;
	}

	onMount(async () => {
		pricingError = '';
		try {
			subscriber = await getSubscriberById(cycle.subscriber);
			const startYmd = ymdFromIso(cycle.start_date);
			const endYmd = ymdFromIso(cycle.end_date);
			if (!startYmd || !endYmd) return;
			priceRules = await listPriceRules({ start: startYmd, end: endYmd });
			const total = computeCycleTotal({ subscriber, startYmd, endYmd, rules: priceRules, defaultPrice: 8 });
			baseAmount = total - Number(cycle.coupon_amount || 0);
			amount = baseAmount;
		} catch (e: any) {
			// Pricing is optional; fall back to stored cycle.amount - coupon.
			pricingError = e.message || 'Pricing rules not available';
			priceRules = [];
			subscriber = null;
			baseAmount = Number(cycle.amount || 0) - Number(cycle.coupon_amount || 0);
			amount = baseAmount;
		}
	});

	async function handleSend() {
		isLoading = true;
		errorMessage = '';
		try {
			const paymentLink = `https://dummy.payment.link/${cycle.subscriber}/${Date.now()}`;

			// In a real app, you would call an API to send an SMS/Email here.
			// For now, we just update the record with the dummy link.
			await updatePaymentCycle(cycle.id, { payment_link: paymentLink });

			alert(`Dummy link sent!\n${paymentLink}`);
			dispatch('close');
		} catch (e: any) {
			errorMessage = e.message;
		} finally {
			isLoading = false;
		}
	}
</script>

<div class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
	<div class="bg-white rounded-lg shadow-xl w-full max-w-sm p-6">
		<h3 class="font-bold text-lg mb-4">Send Payment Link</h3>
		<p class="text-sm text-gray-600 mb-4">
			You can adjust the amount before sending a new payment link to the subscriber.
		</p>
		<div class="mb-4">
			<label for="amount" class="block text-sm font-medium text-gray-700 mb-1">Payment Amount (₹)</label>
			<input type="number" id="amount" class="block w-full rounded-md border-gray-300 shadow-sm" bind:value={amount} />
			{#if pricingError}
				<p class="text-xs text-gray-500 mt-1">{pricingError}. Using stored amount.</p>
			{/if}
		</div>

		{#if errorMessage}<p class="text-sm text-red-600">{errorMessage}</p>{/if}

		<div class="pt-4 flex justify-end gap-3">
			<button on:click={() => dispatch('close')} class="rounded-md bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50">
                Cancel
            </button>
			<button on:click={handleSend} disabled={isLoading} class="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50">
				{isLoading ? 'Sending...' : 'Send Link'}
			</button>
		</div>
	</div>
</div>