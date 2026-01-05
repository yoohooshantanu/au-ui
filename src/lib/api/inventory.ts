import { API_BASE_URL } from './config';
import { authFetch } from '$lib/auth';

export interface InventoryAllocation {
	id?: string;
	center: string; // matches subscriber.center_name
	date: string; // YYYY-MM-DD
	quantity: number; // quantity allocated (e.g., liters)
	added_by: string; // user.id who performed allocation
	created?: string;
	updated?: string;
}

export interface InventorySummary {
	center: string;
	totalAllocated: number;
	totalConsumed: number;
	remaining: number;
}

export async function getInventoryAllocations(
	params: {
		center?: string;
		fromDate?: string; // YYYY-MM-DD
		toDate?: string; // YYYY-MM-DD
		page?: number;
		perPage?: number;
	},
	customFetch?: typeof fetch
): Promise<{ items: InventoryAllocation[]; totalItems?: number; totalPages?: number }> {
	const query = new URLSearchParams();
	if (params.center) query.set('filter', `center="${params.center}"`);
	if (params.fromDate && params.toDate) {
		const dateFilter = `date>="${params.fromDate}" && date<="${params.toDate}"`;
		query.set('filter', params.center ? `${query.get('filter')} && ${dateFilter}` : dateFilter);
	}
	if (params.page) query.set('page', params.page.toString());
	if (params.perPage) query.set('perPage', params.perPage.toString());

	const response = await authFetch(`${API_BASE_URL}/collections/inventory_allocations/records?${query.toString()}`, {}, customFetch);
	if (!response.ok) throw new Error('Failed to fetch inventory allocations');
	return response.json();
}

export async function createInventoryAllocation(payload: Omit<InventoryAllocation, 'id' | 'created' | 'updated'>): Promise<InventoryAllocation> {
	const response = await authFetch(`${API_BASE_URL}/collections/inventory_allocations/records`, {
		method: 'POST',
		body: JSON.stringify(payload)
	});
	if (!response.ok) {
		const err = await response.json().catch(() => ({}));
		throw new Error(err.message || 'Failed to create allocation');
	}
	return response.json();
}

// Compute consumption per center for a date range using missed_deliveries and subscriber counts
export async function computeInventoryConsumption(params: {
	center?: string;
	fromDate: string;
	toDate: string;
}): Promise<{ center: string; date: string; consumed: number }[]> {
	// 1) Count active subscribers per center (could be passed in or fetched)
	// 2) Count missed deliveries per center per date
	// 3) consumption = active_subscribers - missed_deliveries
	// For now, return placeholder; implement with actual aggregation in caller or backend
	throw new Error('Not implemented: use aggregate queries in caller');
}

// Get remaining stock per center as of a date
export async function getInventoryRemaining(params: {
	center?: string;
	asOfDate: string;
}): Promise<InventorySummary[]> {
	// TODO: aggregate allocations up to asOfDate and subtract computed consumption
	throw new Error('Not implemented: aggregate in caller or backend');
}
