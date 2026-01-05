<script lang="ts">
	import type { InventorySummary } from '$lib/api/inventory';

	export let summaries: InventorySummary[] = [];
</script>

<div class="mt-8 bg-white shadow rounded-lg">
	<div class="px-4 py-5 sm:p-6">
		<h3 class="text-lg font-medium text-gray-900 mb-4">Inventory Summary (Remaining Stock)</h3>
		<div class="overflow-x-auto">
			<table class="min-w-full divide-y divide-gray-200">
				<thead class="bg-gray-50">
					<tr>
						<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Center</th>
						<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Allocated</th>
						<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Consumed</th>
						<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Remaining</th>
					</tr>
				</thead>
				<tbody class="bg-white divide-y divide-gray-200">
					{#each summaries as summary}
						<tr>
							<td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{summary.center}</td>
							<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{summary.totalAllocated}</td>
							<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{summary.totalConsumed}</td>
							<td class="px-6 py-4 whitespace-nowrap text-sm">
								<span class="inline-flex items-center rounded-full {summary.remaining > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'} px-2.5 py-0.5 text-xs font-medium">
									{summary.remaining}
								</span>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
			{#if summaries.length === 0}
				<div class="text-center py-8 text-gray-500">No inventory data available.</div>
			{/if}
		</div>
	</div>
</div>
