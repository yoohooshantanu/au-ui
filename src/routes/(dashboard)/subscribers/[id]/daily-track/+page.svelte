<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { getSubscriberById, type Subscriber } from '$lib/api/subscribers';
	import { getSubscriberPaymentCycles } from '$lib/api/subscribers';
	import type { PaymentCycle } from '$lib/api/payment_cycles';
	import { listPriceRules, type PriceRule } from '$lib/api/price_rules';
	import { resolveDailyPrice } from '$lib/utils/pricing';
	import {
		createMissedDelivery,
		deleteMissedDelivery,
		listMissedDeliveriesForMonth,
		type MissedDelivery
	} from '$lib/api/missed_deliveries';
	import MissedReasonModal from '$lib/components/subscribers/MissedReasonModal.svelte';

	const subscriberId = $page.params.id;

	let subscriber: Subscriber | null = null;
	let billingCycle: PaymentCycle | null = null;

	let monthCursor = new Date(new Date().getFullYear(), new Date().getMonth(), 1); // the month shown in calendar
	let isLoading = true;
	let isMonthLoading = true;
	let error: string | null = null;
	let monthError: string | null = null;
	let pricingError: string | null = null;
	let priceRules: PriceRule[] = [];
	let showReasonModal = false;
	let selectedTodayKey: string | null = null;

	// Exception-based tracking logic:
	// - Delivery is RECEIVED by default.
	// - Only MISSED days are stored as records in `missed_deliveries`.
	// - If a date exists in missed_deliveries => missed.
	// - If no record exists => received.
	let missedByDate = new Map<string, MissedDelivery>(); // key = YYYY-MM-DD

	function toYmd(date: Date) {
		const yyyy = date.getFullYear();
		const mm = String(date.getMonth() + 1).padStart(2, '0');
		const dd = String(date.getDate()).padStart(2, '0');
		return `${yyyy}-${mm}-${dd}`;
	}

	function isValidDate(d: Date) {
		return d instanceof Date && !Number.isNaN(d.getTime());
	}

	function startOfMonth(d: Date) {
		return new Date(d.getFullYear(), d.getMonth(), 1);
	}

	function endOfMonth(d: Date) {
		return new Date(d.getFullYear(), d.getMonth() + 1, 0);
	}

	function isSameDay(a: Date, b: Date) {
		return (
			a.getFullYear() === b.getFullYear() &&
			a.getMonth() === b.getMonth() &&
			a.getDate() === b.getDate()
		);
	}

	function todayYmd() {
		return toYmd(new Date());
	}

	function isToday(date: Date) {
		return toYmd(date) === todayYmd();
	}

	function parseDateOnly(isoLike: string) {
		// PB might return ISO datetime; we treat it as date-only for UI.
		return new Date(isoLike);
	}

	function getCurrentBillingCycle(cycles: PaymentCycle[]): PaymentCycle | null {
		if (!cycles || cycles.length === 0) return null;
		const today = new Date();

		const containing = cycles.find((c) => {
			const start = new Date(c.start_date);
			const end = new Date(c.end_date);
			return start <= today && today <= end;
		});
		if (containing) return containing;

		// If nothing contains today, pick the most recent past cycle (avoid choosing a future cycle,
		// which would disable all past/today dates).
		const pastCycles = cycles
			.filter((c) => new Date(c.start_date) <= today)
			.sort((a, b) => +new Date(b.start_date) - +new Date(a.start_date));
		if (pastCycles.length > 0) return pastCycles[0];

		// Last resort: pick the earliest future cycle
		return [...cycles].sort((a, b) => +new Date(a.start_date) - +new Date(b.start_date))[0] ?? null;
	}

	function getCycleBounds(cycle: PaymentCycle | null): { start: Date | null; end: Date | null } {
		if (!cycle) return { start: null, end: null };
		const start = new Date(cycle.start_date);
		const end = new Date(cycle.end_date);
		if (!isValidDate(start) || !isValidDate(end)) return { start: null, end: null };
		return { start, end };
	}

	function calcDailyPrice(cycle: PaymentCycle | null): number {
		if (!cycle) return 0;
		const start = new Date(cycle.start_date);
		const end = new Date(cycle.end_date);
		const dayMs = 24 * 60 * 60 * 1000;
		const days = Math.floor((+new Date(end) - +new Date(start)) / dayMs) + 1;
		if (days <= 0) return 0;
		const net = Number(cycle.amount || 0) - Number(cycle.coupon_amount || 0);
		return net / days;
	}

	function isFuture(date: Date) {
		// Compare by YYYY-MM-DD to avoid timezone issues
		return toYmd(date) > todayYmd();
	}

	function isOutsideBillingCycle(date: Date) {
		const { start, end } = getCycleBounds(billingCycle);
		if (!start || !end) return false;

		// If the cycle doesn't align to a full calendar month, don't hard-disable all earlier days.
		// This matches the expected UX where the whole current month is trackable.
		const cycleIsFullMonth =
			start.getDate() === 1 &&
			toYmd(end) === toYmd(new Date(end.getFullYear(), end.getMonth() + 1, 0));
		if (!cycleIsFullMonth) return false;

		// Compare by YYYY-MM-DD to avoid timezone issues
		const d = toYmd(date);
		const s = toYmd(start);
		const e = toYmd(end);
		return d < s || d > e;
	}

	function cycleContainsToday(cycle: PaymentCycle | null) {
		if (!cycle) return false;
		const today = todayYmd();
		const start = toYmd(new Date(cycle.start_date));
		const end = toYmd(new Date(cycle.end_date));
		return start <= today && today <= end;
	}

	function isDisabled(date: Date) {
		// Only future days are blocked.
		return isFuture(date);
	}

	function isClickable(date: Date) {
		// Only current day is clickable.
		return isToday(date) && !isDisabled(date);
	}

	function daysInGrid(month: Date) {
		const first = startOfMonth(month);
		const last = endOfMonth(month);
		// Sunday=0..Saturday=6
		const leading = first.getDay();
		const days: (Date | null)[] = [];
		for (let i = 0; i < leading; i++) days.push(null);
		for (let d = 1; d <= last.getDate(); d++) days.push(new Date(month.getFullYear(), month.getMonth(), d));
		while (days.length % 7 !== 0) days.push(null);
		return days;
	}

	$: monthStart = toYmd(startOfMonth(monthCursor));
	$: monthEnd = toYmd(endOfMonth(monthCursor));
	$: gridDays = daysInGrid(monthCursor);

	$: missedDaysCount = (() => {
		let count = 0;
		for (const key of missedByDate.keys()) {
			if (key >= monthStart && key <= monthEnd) count++;
		}
		return count;
	})();

	async function loadPricingRules() {
		if (!subscriber) {
			pricingError = null;
			priceRules = [];
			return;
		}
		try {
			pricingError = null;
			priceRules = await listPriceRules({ start: monthStart, end: monthEnd });
		} catch (e: any) {
			// Pricing is optional; fall back to default pricing.
			pricingError = e.message || 'Pricing rules not available';
			priceRules = [];
		}
	}

	$: monthStart, monthEnd, subscriber, loadPricingRules();

	$: dailyPrice = subscriber
		? resolveDailyPrice({ subscriber, dateYmd: todayYmd(), rules: priceRules, defaultPrice: 8 })
		: calcDailyPrice(billingCycle);

	$: totalDeduction = (() => {
		if (!subscriber) return missedDaysCount * dailyPrice;
		let sum = 0;
		for (const key of missedByDate.keys()) {
			if (key < monthStart || key > monthEnd) continue;
			sum += resolveDailyPrice({ subscriber, dateYmd: key, rules: priceRules, defaultPrice: 8 });
		}
		return sum;
	})();

	async function loadPage() {
		isLoading = true;
		error = null;
		try {
			subscriber = await getSubscriberById(subscriberId);
			const cycles = await getSubscriberPaymentCycles(subscriberId);
			billingCycle = getCurrentBillingCycle(cycles);

			// Make the visible calendar month match the active context.
			// If today's date is inside the billing cycle, show current month.
			// Otherwise, show the billing cycle's month so days aren't all disabled.
			if (billingCycle && cycleContainsToday(billingCycle)) {
				monthCursor = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
			}
		} catch (e: any) {
			error = e.message || 'Failed to load daily track';
		} finally {
			isLoading = false;
		}
	}

	async function loadMonth() {
		isMonthLoading = true;
		monthError = null;
		try {
			const items = await listMissedDeliveriesForMonth({ subscriberId, monthStart, monthEnd });
			missedByDate = new Map(items.map((it) => [toYmd(parseDateOnly(it.date)), it]));
		} catch (e: any) {
			monthError = e.message || 'Failed to load month';
			missedByDate = new Map();
		} finally {
			isMonthLoading = false;
		}
	}

	onMount(async () => {
		await loadPage();
		await loadMonth();
	});

	$: monthStart, monthEnd, subscriberId, loadMonth();

	async function handleDayClick(date: Date) {
		if (!isClickable(date)) return;
		const key = toYmd(date);
		const existing = missedByDate.get(key);
		try {
			if (existing) {
				if (!confirm('Mark as delivered for today?')) return;
				await deleteMissedDelivery(existing.id);
				missedByDate.delete(key);
				missedByDate = new Map(missedByDate);
				return;
			}
			selectedTodayKey = key;
			showReasonModal = true;
		} catch (e: any) {
			alert(e.message || 'Failed to update day');
		}
	}

	async function handleReasonSave(event: CustomEvent<string>) {
		if (!selectedTodayKey) return;
		try {
			const created = await createMissedDelivery({
				subscriberId,
				date: selectedTodayKey,
				reason: event.detail
			});
			missedByDate.set(selectedTodayKey, created);
			missedByDate = new Map(missedByDate);
			showReasonModal = false;
			selectedTodayKey = null;
		} catch (e: any) {
			alert(e.message || 'Failed to mark missed delivery');
		}
	}

	function prevMonth() {
		monthCursor = new Date(monthCursor.getFullYear(), monthCursor.getMonth() - 1, 1);
	}

	function nextMonth() {
		monthCursor = new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 1);
	}

	function formatMonthTitle(d: Date) {
		return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
	}
</script>

<div class="space-y-4">
	<div class="flex items-start justify-between gap-4 flex-wrap">
		<div>
			<h1 class="text-3xl font-bold text-gray-900">Daily Track</h1>
			{#if subscriber}
				<p class="text-gray-600 mt-1">
					Subscriber: <span class="font-semibold text-gray-900">{subscriber.name}</span>
				</p>
			{/if}
		</div>

		<div class="flex items-center gap-2">
			<button class="btn-action" on:click={prevMonth}>
				Prev
			</button>
			<div class="text-sm font-semibold text-gray-900 min-w-[160px] text-center">
				{formatMonthTitle(monthCursor)}
			</div>
			<button class="btn-action" on:click={nextMonth}>
				Next
			</button>
		</div>
	</div>

	{#if isLoading}
		<div class="p-6 text-sm text-gray-500 bg-white rounded-lg shadow-sm">Loading...</div>
	{:else if error}
		<div class="p-6 text-sm text-red-600 bg-white rounded-lg shadow-sm">{error}</div>
	{:else}
		<div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
			<!-- Calendar -->
			<div class="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200">
				<div class="p-4 border-b border-gray-200 flex items-center justify-between">
					<div class="text-sm font-semibold text-gray-900">Monthly Calendar</div>
					{#if billingCycle}
						<div class="text-xs text-gray-600">
							Cycle: {toYmd(new Date(billingCycle.start_date))} → {toYmd(new Date(billingCycle.end_date))}
						</div>
					{/if}
				</div>

				{#if monthError}
					<div class="p-4 text-sm text-red-600">{monthError}</div>
				{/if}
				{#if isMonthLoading}
					<div class="p-4 text-sm text-gray-500">Loading month...</div>
				{/if}

				<div class="p-4">
					<div class="weekdays-grid">
						<div class="weekday">Sun</div>
						<div class="weekday">Mon</div>
						<div class="weekday">Tue</div>
						<div class="weekday">Wed</div>
						<div class="weekday">Thu</div>
						<div class="weekday">Fri</div>
						<div class="weekday">Sat</div>
					</div>

					<div class="days-grid">
						{#each gridDays as d, idx (idx)}
							{#if d}
								{@const key = toYmd(d)}
								{@const missed = missedByDate.has(key)}
								{@const disabled = isDisabled(d)}
								{@const clickable = isClickable(d)}
								{@const today = isSameDay(d, new Date())}
								{@const showDelivered = !missed && !isFuture(d)}
								<button
									class="day"
									class:day-missed={missed}
									class:day-disabled={disabled}
									class:day-today={today}
									class:day-clickable={clickable}
									disabled={!clickable}
									on:click|stopPropagation={() => handleDayClick(d)}
									aria-label={`Day ${key}`}
								>
									<div class="day-inner">
										<div class="day-number">{d.getDate()}</div>
										<div class="day-mark">
											{#if missed}
												❌
											{:else if showDelivered}
												✔
											{/if}
										</div>
									</div>
								</button>
							{:else}
								<div class="day-empty"></div>
							{/if}
						{/each}
					</div>

					<div class="mt-4 text-xs text-gray-600">
						<div><span class="font-semibold">Default:</span> Delivered (no DB record)</div>
						<div><span class="font-semibold">Missed:</span> Stored in <code class="font-mono">missed_deliveries</code></div>
					</div>
				</div>
			</div>

			<!-- Summary -->
			<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
				<h2 class="text-sm font-semibold text-gray-900">Summary (month)</h2>
				<div class="mt-3 space-y-2 text-sm">
					<div class="flex justify-between">
						<span class="text-gray-600">Missed days</span>
						<span class="font-semibold text-gray-900">{missedDaysCount}</span>
					</div>
					<div class="flex justify-between">
						<span class="text-gray-600">Daily price</span>
						<span class="font-mono text-gray-900">₹{dailyPrice.toFixed(2)}</span>
					</div>
					{#if pricingError}
						<div class="text-xs text-gray-500">{pricingError}. Using default pricing.</div>
					{/if}
					<div class="flex justify-between border-t border-gray-200 pt-2">
						<span class="text-gray-600">Total deduction</span>
						<span class="font-mono font-semibold text-gray-900">₹{totalDeduction.toFixed(2)}</span>
					</div>
				</div>
			</div>
		</div>
	{/if}
</div>

<style>
	@reference '../../../../../app.css';

	.btn-action {
		@apply rounded bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50;
	}

	.day {
		@apply w-full h-8 rounded-md p-1 text-left ring-1 ring-inset ring-gray-200 transition-colors bg-white;
	}
	.day-missed {
		@apply bg-red-50 ring-red-200;
	}
	.day-disabled {
		@apply bg-gray-50 text-gray-400 cursor-not-allowed;
	}
	.day-clickable {
		@apply hover:bg-gray-50 cursor-pointer;
	}
	.day-today {
		@apply ring-2 ring-indigo-500;
	}
	.day-inner {
		@apply h-full flex flex-col;
	}
	.day-number {
		@apply text-[11px] font-semibold text-gray-900;
	}
	.day-mark {
		@apply mt-auto text-right text-[11px];
	}
	.day-empty {
		@apply h-8;
	}
	.weekdays-grid {
		display: grid;
		grid-template-columns: repeat(7, minmax(0, 1fr));
		gap: 0.25rem;
		margin-bottom: 0.5rem;
		font-size: 11px;
		font-weight: 600;
		color: rgb(107 114 128);
	}
	.weekday {
		text-align: center;
	}
	.days-grid {
		display: grid;
		grid-template-columns: repeat(7, minmax(0, 1fr));
		gap: 0.25rem;
	}
</style>

{#if showReasonModal && selectedTodayKey}
	<MissedReasonModal
		dateLabel={selectedTodayKey}
		on:close={() => {
			showReasonModal = false;
			selectedTodayKey = null;
		}}
		on:save={handleReasonSave}
	/>
{/if}
