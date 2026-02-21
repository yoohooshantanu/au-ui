<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import type { PocUser } from '$lib/api/poc';
	import { createPocUser, updatePocUser } from '$lib/api/poc';
	import type { Lookups } from '$lib/api/dashboard';

	export let user: PocUser | null = null;
	export let lookups: Lookups | null = null;
	const dispatch = createEventDispatcher();

	let name = '';
	let email = '';
	let unit = '';
	let city = '';
	let centers: string[] = [];
	let password = '';
	let passwordConfirm = '';
	let isLoading = false;
	let error = '';
    let validationErrors: Record<string, any> = {};

	$: isEditing = !!user?.id;

	// Initialize form data when user changes
	$: if (user) {
		name = user.name || '';
		email = user.email || '';
		unit = user.unit || '';
		city = user.city || '';
		centers = Array.isArray(user.centers) ? [...user.centers] : [];
		password = '';
		passwordConfirm = '';
	} else {
		name = '';
		email = '';
		unit = '';
		city = '';
		centers = [];
		password = '';
		passwordConfirm = '';
	}

	// When city changes, reset centers selection
	function handleCityChange() {
		centers = [];
	}

	// Get centers for selected city - using lookups instead of city_centers API
	function centersForSelectedCity(): string[] {
		if (!city || !lookups?.center_names) return [];
		// For now, return all centers since we don't have city-center mapping in lookups
		// In the future, this should be filtered by city
		return lookups.center_names;
	}

	async function handleSubmit() {
		isLoading = true;
		error = '';
        validationErrors = {};
		try {
			const payload = {
				name,
				email,
				unit,
				city,
				centers,
				password: password || undefined,
				passwordConfirm: passwordConfirm || undefined
			};
			
			if (!payload.password) {
				delete payload.password;
				delete payload.passwordConfirm;
			}
			
			if (isEditing && user?.id) {
				await updatePocUser(user.id, payload);
			} else {
				await createPocUser(payload);
			}
			dispatch('success');
		} catch (e: any) {
			error = e.message;
            if (e.data) {
                validationErrors = e.data;
            }
		} finally {
			isLoading = false;
		}
	}
	// Toggle center selection manually to avoid bind:group issues
	function toggleCenter(center: string, isChecked: boolean) {
		if (isChecked) {
			centers = [...centers, center];
		} else {
			centers = centers.filter(c => c !== center);
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
					<input id="name" type="text" bind:value={name} required class="input" />
				</div>
				<div>
					<label for="email" class="label">Email</label>
					<input id="email" type="email" bind:value={email} required class="input" />
				</div>
				<div>
					<label for="unit" class="label">Unit</label>
					<select id="unit" bind:value={unit} required class="input">
						<option value="">Select Unit</option>
						{#if lookups?.units}
							{#each lookups.units as unit}
								<option value={unit}>{unit}</option>
							{/each}
						{/if}
					</select>
				</div>
				<div>
					<label for="city" class="label">City</label>
					<select id="city" bind:value={city} on:change={handleCityChange} class="input">
						<option value="">Select City</option>
						{#if lookups?.cities}
							{#each lookups.cities as city}
								<option value={city}>{city}</option>
							{/each}
						{/if}
					</select>
				</div>
				<div class="md:col-span-2">
					<label class="label">Centers</label>
					{#if !lookups?.center_names}
						<p class="text-sm text-red-500">No centers available in lookups</p>
					{:else if !city}
						<p class="text-sm text-gray-500">Please select a city first</p>
					{:else}
						<p class="text-xs text-gray-400 mb-2">Available centers: {centersForSelectedCity().length}</p>
						<p class="text-xs text-gray-400 mb-2">Selected centers: {centers.length}</p>
					{/if}
	// Toggle center selection manually to avoid bind:group issues
	function toggleCenter(center: string, isChecked: boolean) {
		if (isChecked) {
			centers = [...centers, center];
		} else {
			centers = centers.filter(c => c !== center);
		}
	}
	</script>
    <!-- ... inside template ... -->
					<div class="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto border rounded-md p-2">
						{#each centersForSelectedCity() as center}
							<label class="flex items-center space-x-2 text-sm">
								<input
									type="checkbox"
									checked={centers.includes(center)}
									on:change={(e) => toggleCenter(center, e.currentTarget.checked)}
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
						bind:value={password}
						placeholder={isEditing ? 'Leave blank to keep current' : ''}
						required={!isEditing}
						class="input"
					/>
				</div>
				<div>
					<label for="passwordConfirm" class="label">Confirm Password</label>
					<input
						id="passwordConfirm"
						type="password"
						bind:value={passwordConfirm}
						placeholder={isEditing ? 'Leave blank to keep current' : ''}
						required={!isEditing && !!password}
						class="input"
					/>
				</div>
			</div>
			{#if error}
				<div class="rounded-md bg-red-50 p-4 mb-4">
					<div class="flex">
						<div class="ml-3">
							<h3 class="text-sm font-medium text-red-800">Error: {error}</h3>
                            {#if Object.keys(validationErrors).length > 0}
                                <div class="mt-2 text-sm text-red-700">
                                    <ul class="list-disc list-inside space-y-1">
                                        {#each Object.entries(validationErrors) as [field, err]}
                                            <li>
                                                <span class="capitalize font-medium">{field}:</span> {err.message}
                                            </li>
                                        {/each}
                                    </ul>
                                </div>
                            {/if}
						</div>
					</div>
				</div>
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
