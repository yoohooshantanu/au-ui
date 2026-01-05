import { API_BASE_URL } from './config';

// Fetch all missed deliveries for a date range (for consumption aggregation)
export async function getMissedDeliveriesInRange(
	params: {
		fromDate: string;
		toDate: string;
	},
	customFetch?: typeof fetch
): Promise<{ id: string; subscriber: string; date: string; reason?: string }[]> {
	const filter = `date>="${params.fromDate}" && date<="${params.toDate}"`;
	const query = new URLSearchParams({ filter, perPage: '5000' });
	const fetchFn = customFetch || fetch;
	const response = await fetchFn(`${API_BASE_URL}/collections/missed_deliveries/records?${query.toString()}`);
	if (!response.ok) throw new Error('Failed to fetch missed deliveries');
	const data = await response.json();
	return data.items ?? [];
}

// Fetch all subscribers (cached client-side for aggregation)
export async function getAllSubscribers(customFetch?: typeof fetch): Promise<{ id: string; center_name?: string }[]> {
	const fetchFn = customFetch || fetch;
	let page = 1;
	const all: { id: string; center_name?: string }[] = [];
	while (true) {
		const query = new URLSearchParams({ page: page.toString(), perPage: '200' });
		const response = await fetchFn(`${API_BASE_URL}/collections/subscribers/records?${query.toString()}`);
		if (!response.ok) throw new Error('Failed to fetch subscribers');
		const data = await response.json();
		const items = (data.items ?? []).map((s: any) => ({ id: s.id, center_name: s.center_name }));
		all.push(...items);
		if (page >= (data.totalPages ?? 1)) break;
		page += 1;
	}
	return all;
}

// Batch create inventory allocations (optional helper)
export async function batchCreateAllocations(
	allocations: Array<{ center: string; date: string; quantity: number; added_by: string }>,
	customFetch?: typeof fetch
) {
	const fetchFn = customFetch || fetch;
	const results = await Promise.all(
		allocations.map(payload =>
			fetchFn(`${API_BASE_URL}/collections/inventory_allocations/records`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload)
			}).then(r => {
				if (!r.ok) throw new Error('Failed to create allocation');
				return r.json();
			})
		)
	);
	return results;
}
