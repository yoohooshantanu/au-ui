<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import type { PocUser } from '$lib/api/poc';
	import type { Lookups } from '$lib/api/dashboard';

	export let users: PocUser[] = [];
	export let lookups: Lookups | null = null;

	const dispatch = createEventDispatcher();
</script>

<div class="overflow-x-auto">
	<table class="min-w-full divide-y divide-gray-200">
		<thead class="bg-gray-50">
			<tr>
				<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
				<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
				<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit</th>
				<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">City</th>
				<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Centers</th>
				<th class="relative px-6 py-3"><span class="sr-only">Actions</span></th>
			</tr>
		</thead>
		<tbody class="bg-white divide-y divide-gray-200">
			{#each users as user (user.id)}
				<tr>
					<td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.name}</td>
					<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.email}</td>
					<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.unit}</td>
					<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.city || '-'}</td>
					<td class="px-6 py-4 text-sm text-gray-500">
						{#if user.centers && user.centers.length > 0}
							<div class="flex flex-wrap gap-1">
								{#each user.centers as center}
									<span class="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
										{center}
									</span>
								{/each}
							</div>
						{:else}
							-
						{/if}
					</td>
					<td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
						<button
							type="button"
							on:click={() => dispatch('edit', user)}
							class="text-indigo-600 hover:text-indigo-900 mr-3"
						>
							Edit
						</button>
						<button
							type="button"
							on:click={() => dispatch('delete', user.id)}
							class="text-red-600 hover:text-red-900"
						>
							Delete
						</button>
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
	{#if users.length === 0}
		<div class="text-center py-8 text-gray-500">No POCs found.</div>
	{/if}
</div>
