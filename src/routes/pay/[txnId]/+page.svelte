<script lang="ts">
	import { onMount } from 'svelte';
	import { PAYU_CONFIG } from '$lib/payu';

	export let data;

	let isLoading = false;
	let error: string | null = null;

	onMount(() => {
		if (data?.paymentData) {
			// Auto-submit instantly (0ms delay) to act as a direct link
			const form = document.getElementById('payu-form') as HTMLFormElement;
			if (form) form.submit();
		}
	});
</script>

<svelte:head>
	<title>Redirecting to Payment...</title>
</svelte:head>

<!-- Hidden PayU form that auto-submits instantly -->
{#if data?.paymentData}
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
{/if}
