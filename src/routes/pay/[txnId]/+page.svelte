<script lang="ts">
	import { onMount } from 'svelte';
	import { PAYU_CONFIG } from '$lib/payu';

	export let data;

	let isLoading = false;
	let error: string | null = null;

	onMount(() => {
		if (data?.paymentData) {
			// Wait a moment so user sees the page, then auto-submit
			setTimeout(() => {
				const form = document.getElementById('payu-form') as HTMLFormElement;
				if (form) form.submit();
			}, 1500);
		}
	});

	function submitPayUForm() {
		const f = document.getElementById('payu-form');
		if (f) /** @type {HTMLFormElement} */ (f).submit();
	}
</script>

<svelte:head>
	<title>Payment - Amar Ujala</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 flex items-center justify-center p-4">
	<div class="bg-white rounded-xl shadow-lg max-w-md w-full p-8">
		{#if isLoading}
			<div class="text-center">
				<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
				<p class="mt-4 text-gray-600">Loading payment details...</p>
			</div>
		{:else if error}
			<div class="text-center">
				<div class="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center mb-4">
					<svg class="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
					</svg>
				</div>
				<h2 class="text-xl font-bold text-gray-800 mb-2">Payment Error</h2>
				<p class="text-gray-600">{error}</p>
			</div>
		{:else if data.paymentData}
			<div class="text-center mb-6">
				<div class="w-16 h-16 mx-auto bg-indigo-100 rounded-full flex items-center justify-center mb-4">
					<svg class="h-8 w-8 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
					</svg>
				</div>
				<h2 class="text-xl font-bold text-gray-800">Amar Ujala</h2>
				<p class="text-sm text-gray-500 mt-1">Subscription Payment</p>
			</div>

			<div class="space-y-3 mb-6">
				<div class="flex justify-between py-2 border-b border-gray-100">
					<span class="text-gray-500">Name</span>
					<span class="font-medium text-gray-800">{data.paymentData.first_name}</span>
				</div>
				<div class="flex justify-between py-2 border-b border-gray-100">
					<span class="text-gray-500">Phone</span>
					<span class="font-medium text-gray-800">{data.paymentData.phone}</span>
				</div>
				<div class="flex justify-between py-2 border-b border-gray-100">
					<span class="text-gray-500">Description</span>
					<span class="font-medium text-gray-800">{data.paymentData.product_info}</span>
				</div>
				<div class="flex justify-between py-3 bg-indigo-50 rounded-lg px-3">
					<span class="text-indigo-700 font-medium">Amount</span>
					<span class="text-xl font-bold text-indigo-700">Rs. {Number(data.paymentData.amount).toFixed(2)}</span>
				</div>
			</div>

			<div class="text-center">
				<div class="animate-pulse text-sm text-gray-500 mb-2">Redirecting to payment gateway...</div>
			</div>

			<!-- Hidden PayU form that auto-submits -->
			<form id="payu-form" method="POST" action={PAYU_CONFIG.baseUrl} class="hidden">
				<input type="hidden" name="key" value={data.payuKey} />
				<input type="hidden" name="txnid" value={data.paymentData.txn_id} />
				<input type="hidden" name="amount" value={data.paymentData.amount} />
				<input type="hidden" name="productinfo" value={data.paymentData.product_info} />
				<input type="hidden" name="firstname" value={data.paymentData.first_name} />
				<input type="hidden" name="email" value={data.paymentData.email || 'noemail@example.com'} />
				<input type="hidden" name="phone" value={data.paymentData.phone} />
				<input type="hidden" name="surl" value={PAYU_CONFIG.successUrl} />
				<input type="hidden" name="furl" value={PAYU_CONFIG.failureUrl} />
				<input type="hidden" name="hash" value={data.payuHash} />
			</form>

			<!-- Manual pay button as fallback -->
			<button
				on:click={submitPayUForm}
				class="w-full mt-4 rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 transition-colors"
			>
				Pay Now — Rs. {Number(data.paymentData.amount).toFixed(2)}
			</button>
		{/if}
	</div>
</div>
