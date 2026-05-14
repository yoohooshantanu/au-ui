import { API_BASE_URL } from './config';

export interface MissedDelivery {
	id: string;
	subscriber: string;
	date: string; // YYYY-MM-DD or ISO string depending on PB
	reason?: string | null;
	created: string;
	updated: string;
}

function getAuthHeader(): Record<string, string> {
	if (typeof localStorage === 'undefined') return {};
	const token = localStorage.getItem('authToken');
	if (!token) return {};
	return { Authorization: `Bearer ${token}` };
}

export async function listMissedDeliveriesForMonth(params: {
	subscriberId: string;
	monthStart: string; // YYYY-MM-DD
	monthEnd: string; // YYYY-MM-DD
}): Promise<MissedDelivery[]> {
	const { subscriberId, monthStart, monthEnd } = params;
	// Exception-based tracking:
	// - Delivered days are NOT stored.
	// - Only missed days exist as records.
	const filter = `(subscriber="${subscriberId}" && date>="${monthStart}" && date<="${monthEnd}")`;
	const query = new URLSearchParams();
	query.set('perPage', '200');
	query.set('filter', filter);

	const response = await fetch(`${API_BASE_URL}/collections/missed_deliveries/records?${query.toString()}`, {
		headers: {
			...getAuthHeader()
		}
	});
	if (!response.ok) {
		const errorData = await response.json().catch(() => ({ message: 'Failed to fetch missed deliveries' }));
		throw new Error(errorData.message || 'Failed to fetch missed deliveries');
	}
	const data = await response.json();
	return data.items ?? [];
}

export async function getMissedDeliveriesByDate(date: string): Promise<MissedDelivery[]> {
	const filter = `(date="${date}")`;
	const query = new URLSearchParams();
	query.set('perPage', '500');
	query.set('filter', filter);

	const response = await fetch(`${API_BASE_URL}/collections/missed_deliveries/records?${query.toString()}`, {
		headers: {
			...getAuthHeader()
		}
	});
	if (!response.ok) {
		return [];
	}
	const data = await response.json();
	return data.items ?? [];
}

export async function createMissedDelivery(params: {
	subscriberId: string;
	date: string; // YYYY-MM-DD
	reason?: string;
}): Promise<MissedDelivery> {
	const response = await fetch(`${API_BASE_URL}/collections/missed_deliveries/records`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
		body: JSON.stringify({
			subscriber: params.subscriberId,
			date: params.date,
			reason: params.reason ?? null
		})
	});
	if (!response.ok) {
		const errorData = await response.json().catch(() => ({ message: 'Failed to create missed delivery' }));
		throw new Error(errorData.message || 'Failed to create missed delivery');
	}
	return response.json();
}

export async function deleteMissedDelivery(id: string): Promise<void> {
	const response = await fetch(`${API_BASE_URL}/collections/missed_deliveries/records/${id}`, {
		method: 'DELETE',
		headers: {
			...getAuthHeader()
		}
	});
	if (!response.ok) {
		try {
			const errorData = await response.json();
			throw new Error(errorData.message || 'Failed to delete missed delivery');
		} catch (e) {
			throw new Error('Failed to delete missed delivery');
		}
	}
}
