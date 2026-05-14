<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { getSubscribers, type Subscriber } from '$lib/api/subscribers';
	import { getPaymentCycles, type PaymentCycle } from '$lib/api/payment_cycles';
	import { getUsers, type User } from '$lib/api/users';

	type ReportType = 'center' | 'unit' | 'daily' | 'all' | 'executive';

	// Read initial type from URL query param
	let reportType: ReportType = ($page.url.searchParams.get('type') as ReportType) || 'center';
	let selectedMonth = (() => {
		const now = new Date();
		return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
	})();
	let selectedDate = new Date().toISOString().split('T')[0];

	let isLoading = false;
	let error: string | null = null;

	interface PaymentRow {
		label: string;
		totalReaders: number;
		totalAmount: number;
		totalCoupon: number;
		totalPayable: number;
		dueCount: number;
		paidCount: number;
	}
	let reportRows: PaymentRow[] = [];

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
		const subs: Subscriber[] = [];
		let pg = 1;
		while (true) {
			const resp = await getSubscribers({ page: pg });
			subs.push(...(resp.items ?? []));
			if (pg >= (resp.totalPages ?? 1)) break;
			pg += 1;
		}
		return subs;
	}

	async function loadAllPaymentCycles(month: string, isDue?: boolean): Promise<PaymentCycle[]> {
		const cycles: PaymentCycle[] = [];
		let pg = 1;
		while (true) {
			const resp = await getPaymentCycles({ page: pg, perPage: 200, month, is_due: isDue ?? null });
			cycles.push(...(resp.items ?? []));
			if (pg >= (resp.totalPages ?? 1)) break;
			pg += 1;
		}
		return cycles;
	}

	function buildRow(label: string, subs: Subscriber[], cycles: PaymentCycle[], subIds: Set<string>): PaymentRow {
		const relevant = cycles.filter(c => subIds.has(c.subscriber));
		const totalAmount = relevant.reduce((s, c) => s + Number(c.amount || 0), 0);
		const totalCoupon = relevant.reduce((s, c) => s + Number(c.coupon_amount || 0), 0);
		return {
			label,
			totalReaders: subs.length,
			totalAmount,
			totalCoupon,
			totalPayable: totalAmount - totalCoupon,
			dueCount: relevant.filter(c => c.is_due).length,
			paidCount: relevant.filter(c => !c.is_due).length
		};
	}

	async function generateReport() {
		isLoading = true;
		error = null;
		reportRows = [];
		try {
			const allSubs = await loadAllSubscribers();
			const allCycles = await loadAllPaymentCycles(selectedMonth);
			const subById = new Map(allSubs.map(s => [s.id, s]));

			if (reportType === 'center') {
				const groups = new Map<string, Subscriber[]>();
				for (const sub of allSubs) {
					const key = sub.center_name || 'Unknown';
					if (!groups.has(key)) groups.set(key, []);
					groups.get(key)!.push(sub);
				}
				for (const [center, subs] of groups) {
					const ids = new Set(subs.map(s => s.id));
					reportRows.push(buildRow(center, subs, allCycles, ids));
				}
			} else if (reportType === 'unit') {
				const groups = new Map<string, Subscriber[]>();
				for (const sub of allSubs) {
					const key = sub.unit || 'Unknown';
					if (!groups.has(key)) groups.set(key, []);
					groups.get(key)!.push(sub);
				}
				for (const [unit, subs] of groups) {
					const ids = new Set(subs.map(s => s.id));
					reportRows.push(buildRow(unit, subs, allCycles, ids));
				}
			} else if (reportType === 'daily') {
				// Filter cycles to selected date
				const dayCycles = allCycles.filter(c => {
					const start = c.start_date?.split('T')[0];
					const end = c.end_date?.split('T')[0];
					return start && end && selectedDate >= start && selectedDate <= end;
				});
				const groups = new Map<string, Subscriber[]>();
				for (const sub of allSubs) {
					const key = sub.center_name || 'Unknown';
					if (!groups.has(key)) groups.set(key, []);
					groups.get(key)!.push(sub);
				}
				for (const [center, subs] of groups) {
					const ids = new Set(subs.map(s => s.id));
					reportRows.push(buildRow(center, subs, dayCycles, ids));
				}
			} else if (reportType === 'all') {
				const ids = new Set(allSubs.map(s => s.id));
				reportRows.push(buildRow('All Units', allSubs, allCycles, ids));
			} else if (reportType === 'executive') {
				// Group by user/executive (unit)
				let users: User[] = [];
				try {
					users = await getUsers();
				} catch (e) {
					users = [];
				}
				for (const user of users) {
					if (user.unit === 'ALL') continue; // skip admins
					const execSubs = allSubs.filter(s => s.unit === user.unit);
					const ids = new Set(execSubs.map(s => s.id));
					reportRows.push(buildRow(`${user.name} (${user.unit})`, execSubs, allCycles, ids));
				}
			}

			reportRows = reportRows.sort((a, b) => a.label.localeCompare(b.label));
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
			'Total Readers': r.totalReaders,
			'Total Amount': r.totalAmount,
			'Coupon': r.totalCoupon,
			'Payable': r.totalPayable,
			'Due Cycles': r.dueCount,
			'Paid Cycles': r.paidCount
		})));
		const wb = utils.book_new();
		utils.book_append_sheet(wb, ws, 'Payment Report');
		writeFile(wb, `payment_report_${reportType}_${selectedMonth}.xlsx`);
	}

	onMount(generateReport);

	const reportLabels: Record<ReportType, string> = {
		center: 'Center-wise Payment/Due',
		unit: 'Unit-wise Payment/Due',
		daily: 'Daily Payment',
		all: 'All Units Payment/Due',
		executive: 'Executive-wise Payment/Due'
	};
</script>

<div class="space-y-6">
	<div class="flex justify-between items-center flex-wrap gap-3">
		<div>
			<h1 class="text-3xl font-bold text-gray-800">{reportLabels[reportType]}</h1>
			<p class="mt-1 text-gray-500">Payment and due summary for {selectedMonth}.</p>
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
	<div class="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
		<div class="grid grid-cols-1 md:grid-cols-4 gap-4">
			<div>
				<label for="report-type" class="block text-sm font-medium text-gray-700 mb-1">Report Type</label>
				<select id="report-type" bind:value={reportType} on:change={generateReport}
					class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm">
					<option value="center">Center-wise Payment/Due</option>
					<option value="unit">Unit-wise Payment/Due</option>
					<option value="daily">Daily Payment</option>
					<option value="all">All Units Payment/Due</option>
					<option value="executive">Executive-wise Payment/Due</option>
				</select>
			</div>
			<div>
				<label for="month" class="block text-sm font-medium text-gray-700 mb-1">Month</label>
				<input id="month" type="month" bind:value={selectedMonth} on:change={generateReport}
					class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
			</div>
			{#if reportType === 'daily'}
				<div>
					<label for="date" class="block text-sm font-medium text-gray-700 mb-1">Date</label>
					<input id="date" type="date" bind:value={selectedDate} on:change={generateReport}
						class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
				</div>
			{/if}
		</div>
	</div>

	<!-- Report Table -->
	<div class="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200">
		<div class="overflow-x-auto">
			<table class="w-full text-sm">
				<thead class="bg-gray-50">
					<tr>
						<th class="p-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
							{reportType === 'unit' ? 'Unit' : reportType === 'executive' ? 'Executive' : reportType === 'all' ? 'Summary' : 'Center'}
						</th>
						<th class="p-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Readers</th>
						<th class="p-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Amount</th>
						<th class="p-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Coupon</th>
						<th class="p-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Payable</th>
						<th class="p-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Due</th>
						<th class="p-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Paid</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-gray-200">
					{#if isLoading}
						<tr><td colspan="7" class="p-6 text-center text-gray-500">Loading report...</td></tr>
					{:else if error}
						<tr><td colspan="7" class="p-6 text-center text-red-600">{error}</td></tr>
					{:else if reportRows.length === 0}
						<tr><td colspan="7" class="p-6 text-center text-gray-500">No data found for this period.</td></tr>
					{:else}
						{#each reportRows as row}
							<tr class="hover:bg-gray-50">
								<td class="p-4 font-medium text-gray-800">{row.label}</td>
								<td class="p-4 text-right font-mono">{row.totalReaders}</td>
								<td class="p-4 text-right font-mono">Rs. {row.totalAmount.toFixed(2)}</td>
								<td class="p-4 text-right font-mono text-orange-600">Rs. {row.totalCoupon.toFixed(2)}</td>
								<td class="p-4 text-right font-mono font-semibold">Rs. {row.totalPayable.toFixed(2)}</td>
								<td class="p-4 text-right font-mono text-red-600">{row.dueCount}</td>
								<td class="p-4 text-right font-mono text-green-600">{row.paidCount}</td>
							</tr>
						{/each}
						<!-- Totals -->
						<tr class="bg-gray-50 font-semibold border-t-2 border-gray-300">
							<td class="p-4">Totals</td>
							<td class="p-4 text-right font-mono">{reportRows.reduce((s, r) => s + r.totalReaders, 0)}</td>
							<td class="p-4 text-right font-mono">Rs. {reportRows.reduce((s, r) => s + r.totalAmount, 0).toFixed(2)}</td>
							<td class="p-4 text-right font-mono text-orange-600">Rs. {reportRows.reduce((s, r) => s + r.totalCoupon, 0).toFixed(2)}</td>
							<td class="p-4 text-right font-mono font-semibold">Rs. {reportRows.reduce((s, r) => s + r.totalPayable, 0).toFixed(2)}</td>
							<td class="p-4 text-right font-mono text-red-600">{reportRows.reduce((s, r) => s + r.dueCount, 0)}</td>
							<td class="p-4 text-right font-mono text-green-600">{reportRows.reduce((s, r) => s + r.paidCount, 0)}</td>
						</tr>
					{/if}
				</tbody>
			</table>
		</div>
	</div>
</div>
