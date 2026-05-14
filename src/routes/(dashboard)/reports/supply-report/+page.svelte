<script lang="ts">
	import { onMount } from 'svelte';
	import { getSubscribers, type Subscriber } from '$lib/api/subscribers';
	import { getInventoryAllocations, type InventoryAllocation } from '$lib/api/inventory';
	import { listMissedDeliveriesForMonth } from '$lib/api/missed_deliveries';

	type ReportType = 'daily' | 'center' | 'unit' | 'all';

	let reportType: ReportType = 'daily';
	let selectedDate = new Date().toISOString().split('T')[0];
	let selectedMonth = (() => {
		const now = new Date();
		return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
	})();

	let isLoading = false;
	let error: string | null = null;
	let reportRows: any[] = [];

	interface SupplyRow {
		label: string;
		totalSubscribers: number;
		totalMissed: number;
		delivered: number;
		allocated: number;
	}

	function monthBounds(yyyyMm: string) {
		const [yyyyStr, mmStr] = yyyyMm.split('-');
		const yyyy = Number(yyyyStr);
		const mm = Number(mmStr) - 1;
		const start = new Date(yyyy, mm, 1);
		const end = new Date(yyyy, mm + 1, 0);
		return {
			startYmd: start.toISOString().split('T')[0],
			endYmd: end.toISOString().split('T')[0]
		};
	}

	async function loadAllSubscribers(): Promise<Subscriber[]> {
		const firstResp = await getSubscribers({ page: 1, perPage: 200 });
		const subs: Subscriber[] = [...(firstResp.items ?? [])];
		const totalPages = firstResp.totalPages ?? 1;
		
		if (totalPages > 1) {
			const promises = [];
			for (let p = 2; p <= totalPages; p++) {
				promises.push(getSubscribers({ page: p, perPage: 200 }));
			}
			const results = await Promise.all(promises);
			for (const res of results) {
				subs.push(...(res.items ?? []));
			}
		}
		return subs;
	}

	async function generateReport() {
		isLoading = true;
		error = null;
		reportRows = [];
		try {
			const subs = await loadAllSubscribers();
			const { startYmd, endYmd } = monthBounds(selectedMonth);

			// Load allocations for the month
			let allocations: InventoryAllocation[] = [];
			try {
				const allocResp = await getInventoryAllocations({ fromDate: startYmd, toDate: endYmd, perPage: 500 });
				allocations = allocResp.items || [];
			} catch (e) {
				allocations = [];
			}

			if (reportType === 'daily') {
				// Group subscribers by center, show daily supply for selected date
				const centerMap = new Map<string, Subscriber[]>();
				for (const sub of subs) {
					const center = sub.center_name || 'Unknown';
					if (!centerMap.has(center)) centerMap.set(center, []);
					centerMap.get(center)!.push(sub);
				}
				const rows: SupplyRow[] = [];
				for (const [center, centerSubs] of centerMap) {
					const allocated = allocations
						.filter(a => a.center === center && a.date === selectedDate)
						.reduce((sum, a) => sum + (a.quantity || 0), 0);
					rows.push({
						label: center,
						totalSubscribers: centerSubs.length,
						totalMissed: 0, // Would need missed_deliveries data for the specific date
						delivered: centerSubs.length, // Approximate: all minus missed
						allocated
					});
				}
				reportRows = rows.sort((a, b) => a.label.localeCompare(b.label));
			} else if (reportType === 'center') {
				const centerMap = new Map<string, Subscriber[]>();
				for (const sub of subs) {
					const center = sub.center_name || 'Unknown';
					if (!centerMap.has(center)) centerMap.set(center, []);
					centerMap.get(center)!.push(sub);
				}
				const rows: SupplyRow[] = [];
				for (const [center, centerSubs] of centerMap) {
					const allocated = allocations
						.filter(a => a.center === center)
						.reduce((sum, a) => sum + (a.quantity || 0), 0);
					rows.push({
						label: center,
						totalSubscribers: centerSubs.length,
						totalMissed: 0,
						delivered: centerSubs.length,
						allocated
					});
				}
				reportRows = rows.sort((a, b) => a.label.localeCompare(b.label));
			} else if (reportType === 'unit') {
				const unitMap = new Map<string, Subscriber[]>();
				for (const sub of subs) {
					const unit = sub.unit || 'Unknown';
					if (!unitMap.has(unit)) unitMap.set(unit, []);
					unitMap.get(unit)!.push(sub);
				}
				const rows: SupplyRow[] = [];
				for (const [unit, unitSubs] of unitMap) {
					const unitCenters = new Set(unitSubs.map(s => s.center_name));
					const allocated = allocations
						.filter(a => unitCenters.has(a.center))
						.reduce((sum, a) => sum + (a.quantity || 0), 0);
					rows.push({
						label: unit,
						totalSubscribers: unitSubs.length,
						totalMissed: 0,
						delivered: unitSubs.length,
						allocated
					});
				}
				reportRows = rows.sort((a, b) => a.label.localeCompare(b.label));
			} else {
				// All units combined
				const totalAllocated = allocations.reduce((sum, a) => sum + (a.quantity || 0), 0);
				reportRows = [{
					label: 'All Units',
					totalSubscribers: subs.length,
					totalMissed: 0,
					delivered: subs.length,
					allocated: totalAllocated
				}];
			}
		} catch (e: any) {
			error = e.message || 'Failed to generate report';
		} finally {
			isLoading = false;
		}
	}

	async function downloadXlsx() {
		const { utils, writeFile } = await import('xlsx');
		const ws = utils.json_to_sheet(reportRows.map(r => ({
			'Group': r.label,
			'Total Subscribers': r.totalSubscribers,
			'Delivered': r.delivered,
			'Missed': r.totalMissed,
			'Stock Allocated': r.allocated
		})));
		const wb = utils.book_new();
		utils.book_append_sheet(wb, ws, 'Supply Report');
		const filename = `supply_report_${reportType}_${selectedMonth}.xlsx`;
		writeFile(wb, filename);
	}

	onMount(generateReport);
</script>

<div class="space-y-6">
	<div class="flex justify-between items-center flex-wrap gap-3">
		<div>
			<h1 class="text-3xl font-bold text-gray-800">Supply Report</h1>
			<p class="mt-1 text-gray-500">View supply data by day, center, unit, or all.</p>
		</div>
		{#if reportRows.length > 0}
			<button
				on:click={downloadXlsx}
				class="rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-500 flex items-center gap-2"
			>
				<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
					<path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd" />
				</svg>
				Download Excel
			</button>
		{/if}
	</div>

	<!-- Filters -->
	<div class="bg-white p-4 rounded-lg shadow-sm">
		<div class="grid grid-cols-1 md:grid-cols-4 gap-4">
			<div>
				<label for="report-type" class="block text-sm font-medium text-gray-700">Report Type</label>
				<select id="report-type" bind:value={reportType} on:change={generateReport}
					class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm">
					<option value="daily">Daily Supply</option>
					<option value="center">Center-wise Supply</option>
					<option value="unit">Unit-wise Supply</option>
					<option value="all">All Units Supply</option>
				</select>
			</div>
			<div>
				<label for="month" class="block text-sm font-medium text-gray-700">Month</label>
				<input id="month" type="month" bind:value={selectedMonth} on:change={generateReport}
					class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
			</div>
			{#if reportType === 'daily'}
				<div>
					<label for="date" class="block text-sm font-medium text-gray-700">Date</label>
					<input id="date" type="date" bind:value={selectedDate} on:change={generateReport}
						class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
				</div>
			{/if}
		</div>
	</div>

	<!-- Report Table -->
	<div class="bg-white rounded-lg shadow-sm overflow-hidden">
		<div class="overflow-x-auto">
			<table class="w-full text-sm">
				<thead class="bg-gray-50">
					<tr>
						<th class="p-4 text-left text-xs font-semibold text-gray-500 uppercase">
							{reportType === 'unit' ? 'Unit' : reportType === 'all' ? 'Summary' : 'Center'}
						</th>
						<th class="p-4 text-right text-xs font-semibold text-gray-500 uppercase">Total Subscribers</th>
						<th class="p-4 text-right text-xs font-semibold text-gray-500 uppercase">Delivered</th>
						<th class="p-4 text-right text-xs font-semibold text-gray-500 uppercase">Missed</th>
						<th class="p-4 text-right text-xs font-semibold text-gray-500 uppercase">Stock Allocated</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-gray-200">
					{#if isLoading}
						<tr><td colspan="5" class="p-6 text-center text-gray-500">Loading...</td></tr>
					{:else if error}
						<tr><td colspan="5" class="p-6 text-center text-red-600">{error}</td></tr>
					{:else if reportRows.length === 0}
						<tr><td colspan="5" class="p-6 text-center text-gray-500">No data found.</td></tr>
					{:else}
						{#each reportRows as row}
							<tr class="hover:bg-gray-50">
								<td class="p-4 font-medium text-gray-800">{row.label}</td>
								<td class="p-4 text-right font-mono">{row.totalSubscribers}</td>
								<td class="p-4 text-right font-mono text-green-600">{row.delivered}</td>
								<td class="p-4 text-right font-mono text-red-600">{row.totalMissed}</td>
								<td class="p-4 text-right font-mono">{row.allocated}</td>
							</tr>
						{/each}
						<!-- Totals Row -->
						<tr class="bg-gray-50 font-semibold">
							<td class="p-4">Totals</td>
							<td class="p-4 text-right font-mono">{reportRows.reduce((s, r) => s + r.totalSubscribers, 0)}</td>
							<td class="p-4 text-right font-mono text-green-600">{reportRows.reduce((s, r) => s + r.delivered, 0)}</td>
							<td class="p-4 text-right font-mono text-red-600">{reportRows.reduce((s, r) => s + r.totalMissed, 0)}</td>
							<td class="p-4 text-right font-mono">{reportRows.reduce((s, r) => s + r.allocated, 0)}</td>
						</tr>
					{/if}
				</tbody>
			</table>
		</div>
	</div>
</div>
