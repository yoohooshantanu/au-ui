import { API_BASE_URL } from './config';
import type { PaymentCycle } from './payment_cycles'; // Assuming this type exists

// --- UPDATED ---
// Define the Subscriber interface to include the new fields
export interface Subscriber {
	id: string;
	name: string;
	phone: string;
	email: string;
	address: string;
	city: string;
	state: string;
	pincode: string;
	unit: string;
	center_name: string; // <-- NEW
	landmark: string;    // <-- NEW
	created: string;
	updated: string;
}

export interface PaginatedSubscribers {
	page: number;
	perPage: number;
	totalItems: number;
	totalPages: number;
	items: Subscriber[];
}

export async function getSubscribers(
	params: {
		page?: number;
		search?: string;
		city?: string;
		unit?: string;
		pincode?: string;
		center_name?: string;
		landmark?: string;
		subscriberIds?: string[];
	} = {},
	customFetch?: typeof fetch
): Promise<PaginatedSubscribers> {
	const query = new URLSearchParams();
	const filters: string[] = [];
	const fetchFn = customFetch || fetch;

	function quote(value: string) {
		return `'${value.replace(/'/g, "\\'")}'`;
	}

	if (params.page) query.set('page', params.page.toString());

	if (params.search) {
		const term = quote(params.search);
		filters.push(`(name ~ ${term} || phone ~ ${term} || center_name ~ ${term} || landmark ~ ${term})`);
	}
	if (params.city) filters.push(`city = ${quote(params.city)}`);
	if (params.unit) filters.push(`unit = ${quote(params.unit)}`);
	if (params.pincode) filters.push(`pincode = ${quote(params.pincode)}`);
	if (params.center_name) filters.push(`center_name = ${quote(params.center_name)}`);
	if (params.landmark) filters.push(`landmark = ${quote(params.landmark)}`);
	if (params.subscriberIds?.length) {
		const subset = params.subscriberIds.map((id) => `id = ${quote(id)}`).join(' || ');
		filters.push(`(${subset})`);
	}

	if (filters.length > 0) query.set('filter', filters.join(' && '));
	query.set('perPage', '25');

	const response = await fetchFn(`${API_BASE_URL}/collections/subscribers/records?${query.toString()}`);

	if (!response.ok) {
		const errorData = await response.json().catch(() => ({ message: 'Failed to fetch subscribers' }));
		throw new Error(errorData.message || 'An unknown error occurred');
	}

	return response.json();
}

// No changes needed here. `Partial<Subscriber>` will automatically
// include the new fields `center_name` and `landmark`.
export async function createSubscriber(data: Partial<Subscriber>): Promise<Subscriber> {
	const response = await fetch(`${API_BASE_URL}/collections/subscribers/records`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(data)
	});
	if (!response.ok) {
		const errorData = await response.json().catch(() => ({ message: 'Failed to create subscriber' }));
		throw new Error(errorData.message || 'An unknown error occurred');
	}
	return response.json();
}

// No changes needed here either for the same reason as createSubscriber.
export async function updateSubscriber(id: string, data: Partial<Subscriber>): Promise<Subscriber> {
	const response = await fetch(`${API_BASE_URL}/collections/subscribers/records/${id}`, {
		method: 'PATCH',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(data)
	});
	if (!response.ok) {
		const errorData = await response.json().catch(() => ({ message: 'Failed to update subscriber' }));
		throw new Error(errorData.message || 'An unknown error occurred');
	}
	return response.json();
}

export async function deleteSubscriber(id: string): Promise<void> {
	const response = await fetch(`${API_BASE_URL}/collections/subscribers/records/${id}`, {
		method: 'DELETE'
	});
	if (!response.ok) {
		try {
			const errorData = await response.json();
			throw new Error(errorData.message || 'Failed to delete subscriber');
		} catch (e) {
			throw new Error('Failed to delete subscriber');
		}
	}
}

export async function getSubscriberById(id: string): Promise<Subscriber> {
	const response = await fetch(`${API_BASE_URL}/collections/subscribers/records/${id}`);
	if (!response.ok) {
		const errorData = await response.json().catch(() => ({ message: 'Failed to fetch subscriber' }));
		throw new Error(errorData.message || 'Failed to fetch subscriber');
	}
	return response.json();
}

// No changes needed in this function.
export async function getSubscriberPaymentCycles(id: string): Promise<PaymentCycle[]> {
	const response = await fetch(`${API_BASE_URL}/collections/payment_cycles/records?subscriber=${id}`);
	if (!response.ok) {
		throw new Error('Failed to fetch subscriber payment cycles');
	}
	const data = await response.json();
	return data.items;
}