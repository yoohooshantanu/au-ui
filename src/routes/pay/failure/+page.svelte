<svelte:head>
	<title>Payment Failed</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 flex items-center justify-center p-4">
	<div class="bg-white rounded-xl shadow-lg max-w-md w-full p-8 text-center">
		<div class="w-20 h-20 mx-auto bg-red-100 rounded-full flex items-center justify-center mb-6">
			<svg class="h-10 w-10 text-red-600" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
				<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
			</svg>
		</div>
		<h1 class="text-2xl font-bold text-gray-900 mb-2">Payment Failed</h1>
		<p class="text-gray-600 mb-6">
			Unfortunately, your payment could not be processed. Please try again or contact your executive for assistance.
		</p>
		<div class="bg-red-50 rounded-lg p-4 mb-6">
			<p class="text-sm text-red-700">
				If an amount was deducted, it will be refunded within 5-7 business days.
			</p>
		</div>
		<p class="text-xs text-gray-400">You can close this page now.</p>
	</div>
</div>
