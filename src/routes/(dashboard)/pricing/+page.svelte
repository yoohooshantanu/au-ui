<script lang="ts">
	import { onMount } from 'svelte';
	import {
		createPriceRule,
		deletePriceRule,
		listPriceRules,
		updatePriceRule,
		type PriceRule
	} from '$lib/api/price_rules';
	import PriceRuleFormModal from '$lib/components/pricing/PriceRuleFormModal.svelte';
	import { DEFAULT_DAILY_PRICE } from '$lib/utils/pricing';

	let rules: PriceRule[] = [];
	let isLoading = true;
	let error: string | null = null;
	let showForm = false;
	let selectedRule: PriceRule | null = null;

	async function loadRules() {
		isLoading = true;
		error = null;
		try {
			rules = await listPriceRules();
		} catch (e: any) {
			error = e.message || 'Failed to load pricing rules';
		} finally {
			isLoading = false;
		}
	}

	onMount(loadRules);

	function handleAdd() {
		selectedRule = null;
		showForm = true;
	}

	function handleEdit(rule: PriceRule) {
		selectedRule = rule;
		showForm = true;
	}

	async function handleDelete(id: string) {
		if (!confirm('Are you sure? This cannot be undone.')) return;
		try {
			await deletePriceRule(id);
			await loadRules();
		} catch (e: any) {
			alert(e.message || 'Failed to delete rule');
		}
	}

	async function handleSave(event: CustomEvent<any>) {
		try {
			if (selectedRule?.id) {
				await updatePriceRule(selectedRule.id, event.detail);
			} else {
				await createPriceRule(event.detail);
			}
			showForm = false;
			await loadRules();
		} catch (e: any) {
			alert(e.message || 'Failed to save rule');
		}
	}
</script>

<div class="space-y-4">
	<div class="flex justify-between items-center">
		<div>
			<h1 class="text-3xl font-bold text-gray-900">Pricing Rules</h1>
			<p class="text-gray-600 mt-1">Default daily price: <span class="font-mono">Rs. {DEFAULT_DAILY_PRICE}</span>. Add location-specific permanent overrides by Unit, Center, or City.</p>
		</div>
		<button on:click={handleAdd} class="btn-primary">Add Rule</button>
	</div>


	<div class="bg-white rounded-lg shadow-sm overflow-hidden">
		<div class="overflow-x-auto">
			<table class="w-full min-w-[900px] text-sm">
				<thead class="bg-gray-50">
					<tr>
						<th class="th">Scope</th>
						<th class="th">Value</th>
						<th class="th text-right">Daily Price</th>
						<th class="th text-center">Active</th>
						<th class="th text-right">Actions</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-gray-200">
					{#if isLoading}
						<tr><td colspan="5" class="p-6 text-center text-gray-500">Loading...</td></tr>
					{:else if error}
						<tr><td colspan="5" class="p-6 text-center text-red-600">{error}</td></tr>
					{:else if rules.length === 0}
						<tr><td colspan="5" class="p-6 text-center text-gray-500">No active pricing rules found.</td></tr>
					{:else}
						{#each rules as r (r.id)}
							<tr>
								<td class="td">{r.scope_type}</td>
								<td class="td">{r.scope_value}</td>
								<td class="td text-right font-mono">Rs. {Number(r.price || 0).toFixed(2)}</td>
								<td class="td text-center">{r.is_active === false ? 'No' : 'Yes'}</td>
								<td class="td text-right">
									<div class="flex justify-end gap-2">
										<button class="btn-action" on:click={() => handleEdit(r)}>Edit</button>
										<button class="btn-action-destructive" on:click={() => handleDelete(r.id)}>Delete</button>
									</div>
								</td>
							</tr>
						{/each}
					{/if}
				</tbody>
			</table>
		</div>
	</div>
</div>

{#if showForm}
	<PriceRuleFormModal rule={selectedRule} on:close={() => (showForm = false)} on:save={handleSave} />
{/if}

<style>
	@reference '../../../app.css';

	.btn-primary {
		@apply rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500;
	}
	.th {
		@apply p-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider;
	}
	.td {
		@apply p-4;
	}
	.btn-action {
		@apply rounded bg-white px-2 py-1 text-xs font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50;
	}
	.btn-action-destructive {
		@apply rounded bg-red-50 px-2 py-1 text-xs font-semibold text-red-700 shadow-sm ring-1 ring-inset ring-red-200 hover:bg-red-100;
	}
	.input {
		@apply block w-full rounded-md border-gray-300 shadow-sm;
	}
</style>
