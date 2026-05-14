	<script lang="ts">
		import { onMount } from 'svelte';
		import { page } from '$app/stores';
		import { getSubscribers, type Subscriber } from '$lib/api/subscribers';
		import { getUsers, type User } from '$lib/api/users';

		type ReportType = 'center' | 'unit' | 'all' | 'executive';
		let reportType: ReportType = ($page.url.searchParams.get('type') as ReportType) || 'center';

		let isLoading = false;
		let error: string | null = null;

		interface CustomerGroup {
			label: string;
			readers: Subscriber[];
		}
		let groups: CustomerGroup[] = [];

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

		async function generateReport() {
			isLoading = true;
			error = null;
			groups = [];
			try {
				const allSubs = await loadAllSubscribers();

				if (reportType === 'center') {
					const map = new Map<string, Subscriber[]>();
					for (const sub of allSubs) {
						const key = sub.center_name || 'Unknown';
						if (!map.has(key)) map.set(key, []);
						map.get(key)!.push(sub);
					}
					for (const [label, readers] of map) {
						groups.push({ label, readers });
					}
				} else if (reportType === 'unit') {
					const map = new Map<string, Subscriber[]>();
					for (const sub of allSubs) {
						const key = sub.unit || 'Unknown';
						if (!map.has(key)) map.set(key, []);
						map.get(key)!.push(sub);
					}
					for (const [label, readers] of map) {
						groups.push({ label, readers });
					}
				} else if (reportType === 'all') {
					groups = [{ label: 'All Units', readers: allSubs }];
				} else if (reportType === 'executive') {
					let users: User[] = [];
					try { users = await getUsers(); } catch { users = []; }
					for (const user of users) {
						if (user.unit === 'ALL') continue;
						const execSubs = allSubs.filter(s => s.unit === user.unit);
						if (execSubs.length > 0) {
							groups.push({ label: `${user.name} (${user.unit})`, readers: execSubs });
						}
					}
				}
				groups = groups.sort((a, b) => a.label.localeCompare(b.label));
			} catch (e: any) {
				error = e.message || 'Failed to generate report';
			} finally {
				isLoading = false;
			}
		}

		async function downloadXlsx() {
			const { utils, writeFile } = await import('xlsx');
			const allRows: any[] = [];
			for (const group of groups) {
				for (const r of group.readers) {
					allRows.push({
						Group: group.label,
						Name: r.name,
						Phone: r.phone,
						Email: r.email || '',
						Address: r.address || '',
						City: r.city,
						Unit: r.unit,
						Center: r.center_name,
						Status: r.status || 'running',
						Joined: r.created?.split('T')[0] || ''
					});
				}
			}
			const ws = utils.json_to_sheet(allRows);
			const wb = utils.book_new();
			utils.book_append_sheet(wb, ws, 'Customer List');
			writeFile(wb, `customer_list_${reportType}.xlsx`);
		}

		onMount(generateReport);

		const reportLabels: Record<ReportType, string> = {
			center: 'Center-wise Customer List',
			unit: 'Unit-wise Customer List',
			all: 'All Units Customer List',
			executive: 'Executive-wise Customer List'
		};
	</script>

	<div class="space-y-6">
		<div class="flex justify-between items-center flex-wrap gap-3">
			<div>
				<h1 class="text-3xl font-bold text-gray-800">{reportLabels[reportType]}</h1>
				<p class="mt-1 text-gray-500">Complete reader directory grouped by {reportType}.</p>
			</div>
			{#if groups.length > 0}
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

		<!-- Filter -->
		<div class="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
			<div class="flex items-center gap-4">
				<label for="report-type" class="text-sm font-medium text-gray-700">Group By</label>
				<select id="report-type" bind:value={reportType} on:change={generateReport}
					class="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm">
					<option value="center">Center</option>
					<option value="unit">Unit</option>
					<option value="all">All Units</option>
					<option value="executive">Executive</option>
				</select>
			</div>
		</div>

		<!-- Results -->
		{#if isLoading}
			<div class="p-6 text-center text-gray-500">Loading report...</div>
		{:else if error}
			<div class="p-6 text-center text-red-600">{error}</div>
		{:else}
			{#each groups as group}
				<div class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
					<div class="px-4 py-3 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
						<h3 class="font-semibold text-gray-800">{group.label}</h3>
						<span class="text-sm text-gray-500">{group.readers.length} reader{group.readers.length !== 1 ? 's' : ''}</span>
					</div>
					<div class="overflow-x-auto">
						<table class="w-full text-sm">
							<thead class="bg-gray-50">
								<tr>
									<th class="p-3 text-left text-xs font-semibold text-gray-500 uppercase">Name</th>
									<th class="p-3 text-left text-xs font-semibold text-gray-500 uppercase">Phone</th>
									<th class="p-3 text-left text-xs font-semibold text-gray-500 uppercase">City</th>
									<th class="p-3 text-left text-xs font-semibold text-gray-500 uppercase">Center</th>
									<th class="p-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
									<th class="p-3 text-left text-xs font-semibold text-gray-500 uppercase">Joined</th>
								</tr>
							</thead>
							<tbody class="divide-y divide-gray-100">
								{#each group.readers as reader}
									<tr class="hover:bg-gray-50">
										<td class="p-3 font-medium text-gray-800">{reader.name}</td>
										<td class="p-3 text-gray-600">{reader.phone}</td>
										<td class="p-3 text-gray-600">{reader.city}</td>
										<td class="p-3 text-gray-600">{reader.center_name}</td>
										<td class="p-3">
											{#if reader.status === 'closed'}
												<span class="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">Closed</span>
											{:else}
												<span class="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">Running</span>
											{/if}
										</td>
										<td class="p-3 text-gray-500 text-xs">{reader.created?.split('T')[0] || '-'}</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				</div>
			{/each}

			<!-- Summary -->
			{#if groups.length > 0}
				<div class="bg-gray-50 rounded-lg p-4 text-center text-sm text-gray-600">
					Total: {groups.reduce((s, g) => s + g.readers.length, 0)} readers across {groups.length} group{groups.length !== 1 ? 's' : ''}
				</div>
			{/if}
		{/if}
	</div>
