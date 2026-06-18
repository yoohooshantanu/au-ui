<script lang="ts">
	import { createEventDispatcher, onMount } from 'svelte';
	import type { Subscriber } from '$lib/api/subscribers';
	import { createSubscriber, updateSubscriber } from '$lib/api/subscribers';
	import { isAdmin } from '$lib/auth';

	export let subscriber: Subscriber | null = null;
	const dispatch = createEventDispatcher();

	// No changes needed here. `Partial<Subscriber>` is flexible enough
	// to automatically include the new fields.
	let formData: Partial<Subscriber> = subscriber 
		? { 
				...subscriber,
				start_date: subscriber.start_date ? subscriber.start_date.substring(0, 10) : undefined 
			} 
		: { status: 'running' };
	let isLoading = false;
	let errorMessage = '';
	const isEditing = !!subscriber;

	// No changes needed in the submit handler either. It sends the
	// entire `formData` object, which will now contain the new fields.
	async function handleSubmit() {
		isLoading = true;
		errorMessage = '';
		try {
			const payload = {
				...formData,
				start_date: formData.start_date ? new Date(formData.start_date).toISOString() : undefined
			};
			if (isEditing && formData.id) {
				await updateSubscriber(formData.id, payload);
			} else {
				await createSubscriber(payload);
			}
			dispatch('success');
		} catch (e: any) {
			errorMessage = e.message || 'An unknown error occurred.';
		} finally {
			isLoading = false;
		}
	}

	onMount(() => {
		const handleEsc = (e: KeyboardEvent) => {
			if (e.key === 'Escape') dispatch('close');
		};
		window.addEventListener('keydown', handleEsc);
		return () => window.removeEventListener('keydown', handleEsc);
	});
</script>

<div class="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 flex items-center justify-center p-4">
	<div class="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-full overflow-y-auto p-6 relative">
		<button
			on:click={() => dispatch('close')}
			class="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
			aria-label="Close form"
		>
			<svg class="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
				<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
			</svg>
		</button>

		<h3 class="font-bold text-xl mb-1 text-gray-900">{isEditing ? 'Edit' : 'Create'} Subscriber</h3>
		<p class="text-sm text-gray-500 mb-6">Fill in the details below to manage a subscriber.</p>

		<form on:submit|preventDefault={handleSubmit} class="space-y-4">
			<!-- --- UPDATED: Grid now contains the new fields --- -->
			<div class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
				<div>
					<label for="name" class="label">Name</label>
					<input type="text" id="name" class="input" bind:value={formData.name} required placeholder="e.g. Raj Kumar"/>
				</div>
				<div>
					<label for="phone" class="label">Phone</label>
					<input type="tel" id="phone" class="input" bind:value={formData.phone} required placeholder="e.g. 9876543210"/>
				</div>
				<div>
					<label for="email" class="label">Email</label>
					<input type="email" id="email" class="input" bind:value={formData.email} placeholder="e.g. raj@example.com"/>
				</div>
				<div>
					<label for="unit" class="label">Unit</label>
					<input type="text" id="unit" class="input" bind:value={formData.unit} placeholder="e.g. Delhi"/>
				</div>
				<div class="md:col-span-2">
					<label for="address" class="label">Address</label>
					<input type="text" id="address" class="input" bind:value={formData.address} placeholder="e.g. 123 Tech Park, Sector 5"/>
				</div>
				<div>
					<label for="city" class="label">City</label>
					<input type="text" id="city" class="input" bind:value={formData.city} placeholder="e.g. Gurgaon"/>
				</div>
				<div>
					<label for="pincode" class="label">Pincode</label>
					<input type="text" id="pincode" class="input" bind:value={formData.pincode} placeholder="e.g. 110092"/>
				</div>

				<!-- --- NEW: Center Name Input --- -->
				<div>
					<label for="center_name" class="label">Center Name</label>
					<input
						type="text"
						id="center_name"
						class="input"
						bind:value={formData.center_name}
						placeholder="e.g. Main Market Center"
					/>
				</div>
				
				<!-- --- NEW: Landmark Input --- -->
				<div>
					<label for="landmark" class="label">Landmark</label>
					<input
						type="text"
						id="landmark"
						class="input"
						bind:value={formData.landmark}
						placeholder="e.g. Near City Hall"
					/>
				</div>

				<!-- --- NEW: Start Date Input --- -->
				<div>
					<label for="start_date" class="label">Start Date</label>
					<input
						type="date"
						id="start_date"
						class="input"
						bind:value={formData.start_date}
					/>
				</div>

				<!-- Status Dropdown -->
				<div>
					<label for="status" class="label">Status</label>
					<select id="status" class="input" bind:value={formData.status}>
						<option value="running">Running</option>
						<option value="closed">Closed</option>
					</select>
				</div>
			</div>

			{#if errorMessage}
				<div class="bg-red-50 text-red-700 p-3 rounded-md text-sm border border-red-200">{errorMessage}</div>
			{/if}

			<div class="pt-4 flex justify-end gap-3">
				<button
					type="button"
					on:click={() => dispatch('close')}
					class="rounded-md bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
				>
					Cancel
				</button>
				<button
					type="submit"
					disabled={isLoading}
					class="flex w-36 justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50"
				>
					{isLoading ? 'Processing...' : isEditing ? 'Save Changes' : 'Submit'}
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
	.input {
		@apply block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6;
	}
</style>