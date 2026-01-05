<script lang="ts">
	import { onMount } from 'svelte';
	import { createEventDispatcher } from 'svelte';
	import type { PocUser } from '$lib/api/poc';
	import { createPocUser, updatePocUser } from '$lib/api/poc';
	import { getCityCenters, type CityCenter } from '$lib/api/city_centers';
	import type { Lookups } from '$lib/api/dashboard';

	export let user: PocUser | null = null;
	export let lookups: Lookups | null = null;
	const dispatch = createEventDispatcher();

	let formData: Partial<PocUser>;
	let isLoading = false;
	let error = '';
	let cityCenters: CityCenter[] = [];

	$: isEditing = !!user?.id;
	$: formData = user
		? { ...user }
		: { name: '', email: '', unit: '', city: '', centers: [], password: '' };

	// When city changes, reset centers selection
	function handleCityChange() {
		formData.centers = [];
	}

	// Get centers for selected city using the mapping
	function centersForSelectedCity(): string[] {
		if (!formData.city) return [];
		const city = cityCenters.find(c => c.city === formData.city);
		return city ? city.centers : [];
	}

	onMount(async () => {
		try {
			console.log('POC Form: Loading city centers...');
			// Only pass fetch on server side
			cityCenters = await getCityCenters();
			console.log('POC Form: Loaded city centers:', cityCenters);
		} catch (e: any) {
			console.error('POC Form: Failed to load city-centers mapping:', e);
		}
	});

	async function handleSubmit() {
		isLoading = true;
		error = '';
		try {
			const payload = { ...formData };
			if (!payload.password) {
				delete payload.password;
			}
			if (isEditing && user?.id) {
				await updatePocUser(user.id, payload);
			} else {
				await createPocUser(payload);
			}
			dispatch('success');
		} catch (e: any) {
			error = e.message;
		} finally {
			isLoading = false;
		}
	}
</script>

<div class="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 flex items-center justify-center p-4">
	<div class="bg-white rounded-lg shadow-xl w-full max-w-lg p-6">
		<h3 class="font-bold text-lg mb-4 text-gray-900">{isEditing ? 'Edit' : 'Create New'} POC</h3>
		<form on:submit|preventDefault={handleSubmit} class="space-y-4">
			<div class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
				<div>
					<label for="name" class="label">Name</label>
					<input id="name" type="text" bind:value={formData.name} required class="input" />
				</div>
				<div>
					<label for="email" class="label">Email</label>
					<input id="email" type="email" bind:value={formData.email} required class="input" />
				</div>
				<div>
					<label for="unit" class="label">Unit</label>
					<input id="unit" type="text" bind:value={formData.unit} required class="input" />
				</div>
				<div>
					<label for="city" class="label">City</label>
					<select id="city" bind:value={formData.city} on:change={handleCityChange} class="input">
						<option value="">Select City</option>
						{#each cityCenters as cc}
							<option value={cc.city}>{cc.city}</option>
						{/each}
					</select>
				</div>
				<div class="md:col-span-2">
					<label class="label">Centers</label>
					<div class="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto border rounded-md p-2">
						{#each centersForSelectedCity() as center}
							<label class="flex items-center space-x-2 text-sm">
								<input
									type="checkbox"
									bind:group={formData.centers}
									value={center}
									class="rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
								/>
								<span>{center}</span>
							</label>
						{/each}
					</div>
				</div>
				<div>
					<label for="password" class="label">Password</label>
					<input
						id="password"
						type="password"
						bind:value={formData.password}
						placeholder={isEditing ? 'Leave blank to keep current' : ''}
						required={!isEditing}
						class="input"
					/>
				</div>
			</div>
			{#if error}
				<p class="text-sm text-red-600">{error}</p>
			{/if}
			<div class="pt-4 flex justify-end gap-3">
				<button type="button" on:click={() => dispatch('cancel')} class="btn-secondary">
					Cancel
				</button>
				<button type="submit" class="btn-primary" disabled={isLoading}>
					{isLoading ? 'Saving...' : 'Save POC'}
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
	.btn-primary {
		@apply rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50;
	}
	.btn-secondary {
		@apply rounded-md bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50;
	}
</style>
