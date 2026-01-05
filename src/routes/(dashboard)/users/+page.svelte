<script lang="ts">
	import { onMount } from 'svelte';
	import { getPocUsers, deletePocUser, type PocUser } from '$lib/api/poc';
	import { getLookups, type Lookups } from '$lib/api/dashboard';
	import PocList from '$lib/components/poc/PocList.svelte';
	import PocForm from '$lib/components/poc/PocForm.svelte';

	let users: PocUser[] = [];
	let lookups: Lookups | null = null;
	let isLoading = true;
	let error = '';
	let showForm = false;
	let selectedUser: PocUser | null = null;

	async function loadUsers() {
		isLoading = true;
		error = '';
		try {
			users = await getPocUsers();
		} catch (e: any) {
			error = e.message;
		} finally {
			isLoading = false;
		}
	}

	onMount(async () => {
		await loadUsers();
		try {
			lookups = await getLookups();
		} catch (e: any) {
			console.error('Failed to load lookups:', e);
		}
	});

	function handleAdd() {
		selectedUser = null;
		showForm = true;
	}

	function handleEdit(event: CustomEvent<PocUser>) {
		selectedUser = event.detail;
		showForm = true;
	}

	async function handleDelete(event: CustomEvent<string>) {
		const userId = event.detail;
		if (confirm('Are you sure you want to delete this POC user?')) {
			try {
				await deletePocUser(userId);
				await loadUsers();
			} catch (e: any) {
				alert(`Error: ${e.message}`);
			}
		}
	}
</script>

<div>
	<div class="flex justify-between items-center mb-6">
		<h1 class="text-3xl font-bold text-gray-900">AU POCs</h1>
		<button on:click={handleAdd} class="btn-primary">Add New POC</button>
	</div>

	{#if isLoading}
		<p>Loading POCs...</p>
	{:else if error}
		<p class="text-red-600">{error}</p>
	{:else}
		<PocList {users} {lookups} on:edit={handleEdit} on:delete={handleDelete} />
	{/if}
</div>

{#if showForm}
	<PocForm
		user={selectedUser}
		{lookups}
		on:cancel={() => (showForm = false)}
		on:success={() => {
			showForm = false;
			loadUsers();
		}}
	/>
{/if}

<style>
	@reference '../../../app.css';
	.btn-primary {
		@apply rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500;
	}
</style>