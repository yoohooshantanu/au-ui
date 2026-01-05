<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData } from './$types';
	export let form: ActionData;

	let isLoading = false;
</script>

<div class="p-6 max-w-xl mx-auto">
	<h1 class="text-2xl font-bold mb-4">Database Seeding</h1>
	<p class="mb-4 text-sm text-gray-600">Use this page to initialize required collections and seed the city‑centers mapping.</p>

	{#if form?.success}
		<div class="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
			{form.message}
		</div>
	{:else if form?.error}
		<div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
			Error: {form.error}
		</div>
	{/if}

	<form
		method="POST"
		use:enhance={() => {
			isLoading = true;
			return async ({ result }) => {
				isLoading = false;
			};
		}}
	>
		<button type="submit" disabled={isLoading} class="btn-primary">
			{isLoading ? 'Running...' : 'Run Seed'}
		</button>
	</form>

	<div class="mt-6 text-xs text-gray-500">
		<p>Required collections:</p>
		<ul class="list-disc list-inside">
			<li>inventory_allocations (center, date, quantity, added_by)</li>
			<li>city_centers (city, centers JSON)</li>
		</ul>
	</div>
</div>

<style>
	@reference '../../../app.css';
	.btn-primary {
		@apply rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50;
	}
</style>
