<script lang="ts">
	import { base } from '$app/paths';
	import { createEventDispatcher, onMount } from 'svelte';
	import { getSubscriberById, type Subscriber } from '$lib/api/subscribers';
	import type { PaymentCycle } from '$lib/api/payment_cycles';
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
	let messageType: 'reminder' | 'payment_link' = 'reminder';

	function ymdFromIso(iso: string) {
		if (!iso) return '';
		if (iso.includes('T')) return iso.split('T')[0];
		return iso;
	}

	function formatDate(isoStr: string) {
		if (!isoStr) return '';
		const d = new Date(isoStr);
		if (isNaN(d.getTime())) return isoStr;
		// Format as DD-MM-YYYY as shown in template
		const day = String(d.getDate()).padStart(2, '0');
		const month = String(d.getMonth() + 1).padStart(2, '0');
		const year = d.getFullYear();
		return `${day}-${month}-${year}`;
	}

	function getMonthName(isoStr: string) {
		if (!isoStr) return '';
		const d = new Date(isoStr);
		if (isNaN(d.getTime())) return '';
		return d.toLocaleString('en-US', { month: 'long' });
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
			pricingError = e.message || 'Pricing rules not available';
			priceRules = [];
			subscriber = null;
			baseAmount = Number(cycle.amount || 0) - Number(cycle.coupon_amount || 0);
			amount = baseAmount;
		}
	});

	async function handleSend(type: 'reminder' | 'payment_link') {
		isLoading = true;
		errorMessage = '';
		try {
			if (!subscriber || !subscriber.phone) {
				throw new Error('Subscriber mobile number is missing.');
			}

			const phone = subscriber.phone;

			const startDate = formatDate(cycle.start_date);
			const endDate = formatDate(cycle.end_date);
			const month = getMonthName(cycle.start_date);
			
			// If cycle.due_date isn't explicitly defined, fallback to end_date.
			// Assuming DLT template expects DD-MM-YYYY
			const dueDate = formatDate((cycle as any).due_date || cycle.end_date);

			const variables = {
				name: subscriber.name,
				month: month,
				amount: amount.toString(),
				total: amount.toString(),
				dueDate: dueDate,
				startDate: startDate,
				endDate: endDate,
				paymentCycleId: cycle.id
			};

			const response = await fetch(`${base}/api/sms`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					phoneNumber: phone,
					templateType: type,
					variables
				})
			});

			const result = await response.json();
			if (!response.ok) {
				throw new Error(result.error || 'Failed to send SMS');
			}

			alert('SMS sent successfully!');
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
		<h3 class="font-bold text-lg mb-4">Send SMS</h3>
		<p class="text-sm text-gray-600 mb-4">
			Adjust the amount if needed and choose which message to send to the reader.
		</p>

		<div class="mb-4">
			<label for="amount" class="block text-sm font-medium text-gray-700 mb-1">Payment Amount (Rs.)</label>
			<input type="number" id="amount" class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" bind:value={amount} />
			{#if pricingError}
				<p class="text-xs text-gray-500 mt-1">{pricingError}. Using stored amount.</p>
			{/if}
		</div>

		{#if errorMessage}<p class="text-sm text-red-600">{errorMessage}</p>{/if}

		<div class="pt-4 flex flex-col gap-2">
			<button on:click={() => handleSend('reminder')} disabled={isLoading} class="w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50">
				{isLoading ? 'Sending...' : 'Send Reminder'}
			</button>
			<button on:click={() => handleSend('payment_link')} disabled={isLoading} class="w-full rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-500 disabled:opacity-50">
				{isLoading ? 'Sending...' : 'Send Payment Link'}
			</button>
			<button on:click={() => dispatch('close')} class="mt-2 w-full rounded-md bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50">
                Cancel
            </button>
		</div>
	</div>
</div>