<svelte:head>
	<title>Payment Successful</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 flex items-center justify-center p-4">
	<div class="bg-white rounded-xl shadow-lg max-w-md w-full p-8 text-center">
		<div class="w-20 h-20 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-6">
			<svg class="h-10 w-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
				<path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
			</svg>
		</div>
		<h1 class="text-2xl font-bold text-gray-900 mb-2">Payment Successful!</h1>
		<p class="text-gray-600 mb-6">
			Your payment has been processed successfully. Thank you for your subscription.
		</p>
		<div class="bg-green-50 rounded-lg p-4 mb-6">
			<p class="text-sm text-green-700">
				A confirmation will be sent to you shortly. If you have any questions, please contact your executive.
			</p>
		</div>
		<p class="text-xs text-gray-400">You can close this page now.</p>
	</div>
</div>
