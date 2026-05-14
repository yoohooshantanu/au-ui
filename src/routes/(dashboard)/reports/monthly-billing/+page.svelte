<script lang="ts">
	import { onMount } from 'svelte';
	import { getSubscribers, type Subscriber } from '$lib/api/subscribers';
	import { getPaymentCycles, type PaymentCycle } from '$lib/api/payment_cycles';
	import { listPriceRules, type PriceRule } from '$lib/api/price_rules';
	import { computeCycleTotal, DEFAULT_DAILY_PRICE } from '$lib/utils/pricing';

	type Row = {
		subscriberId: string;
		name: string;
		city: string;
		center_name: string;
		unit: string;
		cycleId: string;
		cycleStart: string;
		cycleEnd: string;
		total: number;
		coupon: number;
		payable: number;
	};

	function ymdFromIso(iso: string) {
		if (!iso) return '';
		if (iso.includes('T')) return iso.split('T')[0];
		return iso;
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

	let selectedMonth = (() => {
		const now = new Date();
		return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
	})();

	let isLoading = true;
	let error: string | null = null;
	let rows: Row[] = [];
	let rules: PriceRule[] = [];
	let pricingError: string | null = null;

	async function loadReport() {
		isLoading = true;
		error = null;
		pricingError = null;
		try {
			const { startYmd, endYmd } = monthBounds(selectedMonth);

			// Load permanent price rules
			try {
				rules = await listPriceRules();
			} catch (e: any) {
				pricingError = e.message || 'Pricing rules not available';
				rules = [];
			}

			// Load ALL due cycles in this month window.
			// We use /collections/payment_cycles/records endpoint via getPaymentCycles.
			// Month param already exists in the API and should be YYYY-MM.
			const dueCyclesResp = await getPaymentCycles({ page: 1, is_due: true, month: selectedMonth });
			const dueCycles: PaymentCycle[] = dueCyclesResp.items ?? [];

			// Load subscribers in pages efficiently using Promise.all
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

			const subById = new Map(subs.map((s) => [s.id, s]));

			const out: Row[] = [];
			for (const c of dueCycles) {
				const sub = subById.get(c.subscriber);
				if (!sub) continue;
				const startYmd = ymdFromIso(c.start_date);
				const endYmd = ymdFromIso(c.end_date);
				let total = Number(c.amount || 0);
				// Compute dynamic totals when possible
				try {
					if (startYmd && endYmd) {
						total = computeCycleTotal({ subscriber: sub, startYmd, endYmd, rules, defaultPrice: DEFAULT_DAILY_PRICE });
					}
				} catch (e) {
					// ignore and keep stored amount
				}

				const coupon = Number(c.coupon_amount || 0);
				const payable = total - coupon;

				out.push({
					subscriberId: sub.id,
					name: sub.name,
					city: sub.city,
					center_name: sub.center_name,
					unit: sub.unit,
					cycleId: c.id,
					cycleStart: startYmd,
					cycleEnd: endYmd,
					total,
					coupon,
					payable
				});
			}

			rows = out.sort((a, b) => a.name.localeCompare(b.name));
		} catch (e: any) {
			error = e.message || 'Failed to load report';
			rows = [];
		} finally {
			isLoading = false;
		}
	}

	onMount(loadReport);
	$: selectedMonth, loadReport();

	$: totals = rows.reduce(
		(acc, r) => {
			acc.total += r.total;
			acc.coupon += r.coupon;
			acc.payable += r.payable;
			return acc;
		},
		{ total: 0, coupon: 0, payable: 0 }
	);

	async function downloadXlsx() {
		const { utils, writeFile } = await import('xlsx');
		const ws = utils.json_to_sheet(rows.map(r => ({
			'Reader Name': r.name,
			'Unit': r.unit,
			'Center': r.center_name,
			'City': r.city,
			'Cycle Start': r.cycleStart,
			'Cycle End': r.cycleEnd,
			'Total': r.total,
			'Coupon': r.coupon,
			'Payable (incl Coupon)': r.payable
		})));
		const wb = utils.book_new();
		utils.book_append_sheet(wb, ws, 'Monthly Billing');
		writeFile(wb, `monthly_billing_${selectedMonth}.xlsx`);
	}
</script>

<div class="space-y-4">
	<div class="flex justify-between items-center flex-wrap gap-3">
		<div>
			<h1 class="text-3xl font-bold text-gray-800">Monthly Billing</h1>
			<p class="mt-1 text-gray-500">Computed using default Rs. {DEFAULT_DAILY_PRICE} + date overrides (Unit &gt; Center &gt; City).</p>
		</div>
		<div class="flex items-center gap-3">
			{#if rows.length > 0}
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
			<div class="flex items-center gap-2">
				<label class="text-sm text-gray-600" for="month">Month</label>
				<input id="month" type="month" class="input" bind:value={selectedMonth} />
			</div>
		</div>
	</div>

	{#if pricingError}
		<div class="bg-white p-4 rounded-lg shadow-sm border border-gray-200 text-sm text-gray-600">
			{pricingError}. Report will use stored cycle amounts where dynamic pricing cannot be computed.
		</div>
	{/if}

	<div class="bg-white rounded-lg shadow-sm overflow-hidden">
		<div class="overflow-x-auto">
			<table class="w-full min-w-[1100px] text-sm">
				<thead class="bg-gray-50">
					<tr>
						<th class="th">Reader</th>
						<th class="th">Location</th>
						<th class="th">Cycle</th>
						<th class="th text-right">Total</th>
						<th class="th text-right">Coupon</th>
						<th class="th text-right">Payable</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-gray-200">
					{#if isLoading}
						<tr><td colspan="6" class="p-6 text-center text-gray-500">Loading...</td></tr>
					{:else if error}
						<tr><td colspan="6" class="p-6 text-center text-red-600">{error}</td></tr>
					{:else if rows.length === 0}
						<tr><td colspan="6" class="p-6 text-center text-gray-500">No due cycles found for this month.</td></tr>
					{:else}
						{#each rows as r (r.cycleId)}
							<tr class="hover:bg-gray-50">
								<td class="td">
									<div class="font-medium text-gray-900">{r.name}</div>
									<div class="text-xs text-gray-500 font-mono">{r.subscriberId}</div>
								</td>
								<td class="td">
									<div>{r.center_name}</div>
									<div class="text-xs text-gray-500">{[r.city, r.unit].filter(Boolean).join(' - ')}</div>
								</td>
								<td class="td">
									<div class="font-mono text-xs">{r.cycleStart} → {r.cycleEnd}</div>
									<div class="text-xs text-gray-500 font-mono">{r.cycleId}</div>
								</td>
								<td class="td text-right font-mono">Rs. {r.total.toFixed(2)}</td>
								<td class="td text-right font-mono">Rs. {r.coupon.toFixed(2)}</td>
								<td class="td text-right font-mono font-semibold">Rs. {r.payable.toFixed(2)}</td>
							</tr>
						{/each}
						<tr class="bg-gray-50">
							<td class="td font-semibold" colspan="3">Totals</td>
							<td class="td text-right font-mono font-semibold">Rs. {totals.total.toFixed(2)}</td>
							<td class="td text-right font-mono font-semibold">Rs. {totals.coupon.toFixed(2)}</td>
							<td class="td text-right font-mono font-semibold">Rs. {totals.payable.toFixed(2)}</td>
						</tr>
					{/if}
				</tbody>
			</table>
		</div>
	</div>
</div>

<style>
	@reference '../../../../app.css';
	.th {
		@apply p-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider;
	}
	.td {
		@apply p-4;
	}
	.input {
		@apply block rounded-md border-gray-300 shadow-sm;
	}
</style>
