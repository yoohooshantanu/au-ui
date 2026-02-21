<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	export let dateLabel: string;
	const dispatch = createEventDispatcher();

	let reason = '';
	let errorMessage = '';

	function handleSave() {
		errorMessage = '';
		if (!reason.trim()) {
			errorMessage = 'Please enter a reason.';
			return;
		}
		dispatch('save', reason.trim());
	}
</script>

<div class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
	<div class="bg-white rounded-lg shadow-xl w-full max-w-sm p-6">
		<h3 class="font-bold text-lg mb-2 text-gray-900">Mark Missed Delivery</h3>
		<p class="text-sm text-gray-600 mb-4">Reason for not delivered on <span class="font-semibold">{dateLabel}</span></p>

		<label for="reason" class="block text-sm font-medium text-gray-700 mb-1">Reason</label>
		<textarea
			id="reason"
			rows="3"
			class="block w-full rounded-md border-gray-300 shadow-sm"
			bind:value={reason}
			placeholder="e.g. Reader not available"
		></textarea>

		{#if errorMessage}
			<p class="text-sm text-red-600 mt-2">{errorMessage}</p>
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
