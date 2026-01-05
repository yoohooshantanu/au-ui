import { getMissedDeliveriesInRange, getAllSubscribers } from '$lib/api/inventory_aggregations';
import type { InventorySummary } from '$lib/api/inventory';

/**
 * Compute inventory consumption per center for a date range.
 * Consumption per day = active subscribers in center - missed deliveries in center.
 * Returns array of { center, date, consumed }.
 */
export async function computeConsumptionByCenters(
	params: {
		fromDate: string;
		toDate: string;
		centers?: string[]; // optional: limit to these centers
	},
	customFetch?: typeof fetch
): Promise<{ center: string; date: string; consumed: number }[]> {
	const { fromDate, toDate, centers } = params;

	// 1) Fetch all subscribers once and group by center_name
	const allSubs = await getAllSubscribers(customFetch);
	const subsByCenter = new Map<string, number>();
	for (const sub of allSubs) {
		if (!sub.center_name) continue;
		if (centers && !centers.includes(sub.center_name)) continue;
		subsByCenter.set(sub.center_name, (subsByCenter.get(sub.center_name) ?? 0) + 1);
	}

	// 2) Fetch missed deliveries for the entire date range
	const missed = await getMissedDeliveriesInRange({ fromDate, toDate }, customFetch);

	// Build a map missedCountByCenterDate for fast lookup
	const missedCountByCenterDate = new Map<string, number>();
	for (const m of missed) {
		// We need the subscriber's center; build a quick lookup from allSubs
		const sub = allSubs.find(s => s.id === m.subscriber);
		if (!sub?.center_name) continue;
		if (centers && !centers.includes(sub.center_name)) continue;
		const key = `${sub.center_name}|${m.date}`;
		missedCountByCenterDate.set(key, (missedCountByCenterDate.get(key) ?? 0) + 1);
	}

	// 3) Generate daily consumption for each center in the date range
	const results: { center: string; date: string; consumed: number }[] = [];
	const start = new Date(fromDate);
	const end = new Date(toDate);
	for (const d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
		const ymd = d.toISOString().split('T')[0];
		for (const [center, activeCount] of subsByCenter.entries()) {
			const missed = missedCountByCenterDate.get(`${center}|${ymd}`) ?? 0;
			const consumed = Math.max(0, activeCount - missed);
			results.push({ center, date: ymd, consumed });
		}
	}

	return results;
}

/**
 * Compute remaining inventory per center as of a date.
 * Remaining = sum(allocations up to asOfDate) - sum(consumption up to asOfDate).
 */
export async function computeRemainingInventory(params: {
	asOfDate: string;
	allocations: { center: string; date: string; quantity: number }[];
	consumption: { center: string; date: string; consumed: number }[];
}): Promise<InventorySummary[]> {
	const { asOfDate, allocations, consumption } = params;

	const allocatedByCenter = new Map<string, number>();
	const consumedByCenter = new Map<string, number>();

	for (const a of allocations) {
		if (a.date <= asOfDate) {
			allocatedByCenter.set(a.center, (allocatedByCenter.get(a.center) ?? 0) + a.quantity);
		}
	}
	for (const c of consumption) {
		if (c.date <= asOfDate) {
			consumedByCenter.set(c.center, (consumedByCenter.get(c.center) ?? 0) + c.consumed);
		}
	}

	const centers = new Set([...allocatedByCenter.keys(), ...consumedByCenter.keys()]);
	const summaries: InventorySummary[] = [];
	for (const center of centers) {
		const totalAllocated = allocatedByCenter.get(center) ?? 0;
		const totalConsumed = consumedByCenter.get(center) ?? 0;
		summaries.push({
			center,
			totalAllocated,
			totalConsumed,
			remaining: Math.max(0, totalAllocated - totalConsumed)
		});
	}
	return summaries;
}
