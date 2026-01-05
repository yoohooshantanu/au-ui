<script lang="ts">
	import type { InventoryAllocation } from '$lib/api/inventory';

	export let allocations: InventoryAllocation[] = [];

	function formatDate(dateStr: string) {
		return new Date(dateStr).toLocaleDateString();
	}
</script>

<div class="mt-8 bg-white shadow rounded-lg">
	<div class="px-4 py-5 sm:p-6">
		<h3 class="text-lg font-medium text-gray-900 mb-4">Allocation History</h3>
		<div class="overflow-x-auto">
			<table class="min-w-full divide-y divide-gray-200">
				<thead class="bg-gray-50">
					<tr>
						<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
						<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Center</th>
						<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
						<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Allocated By</th>
					</tr>
				</thead>
				<tbody class="bg-white divide-y divide-gray-200">
					{#each allocations as allocation}
						<tr>
							<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(allocation.date)}</td>
							<td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{allocation.center}</td>
							<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{allocation.quantity}</td>
							<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{allocation.added_by}</td>
						</tr>
					{/each}
				</tbody>
			</table>
			{#if allocations.length === 0}
				<div class="text-center py-8 text-gray-500">No allocations found.</div>
			{/if}
		</div>
	</div>
</div>
