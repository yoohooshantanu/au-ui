import { API_BASE_URL } from './config';

export type PriceScopeType = 'unit' | 'center' | 'city' | 'default';

export interface PriceRule {
	id: string;
	date: string; // YYYY-MM-DD
	scope_type: PriceScopeType;
	scope_value: string;
	price: number;
	is_active?: boolean;
	created?: string;
	updated?: string;
}

function getAuthHeader(): Record<string, string> {
	if (typeof localStorage === 'undefined') return {};
	const token = localStorage.getItem('authToken');
	if (!token) return {};
	return { Authorization: `Bearer ${token}` };
}

export async function listPriceRules(params: { start: string; end: string }): Promise<PriceRule[]> {
	const { start, end } = params;
	// Don't filter on is_active at the API layer because the field may not exist in all PB schemas.
	// We filter client-side (treat missing is_active as active).
	const filter = `((date>="${start}" && date<="${end}") || (scope_type="default" && date<="${end}"))`;
	const query = new URLSearchParams();
	query.set('perPage', '500');
	query.set('sort', '-date');
	query.set('filter', filter);

	const response = await fetch(`${API_BASE_URL}/collections/price_rules/records?${query.toString()}`, {
		headers: {
			...getAuthHeader()
		}
	});
	if (!response.ok) {
		const errorData = await response.json().catch(() => ({ message: 'Failed to fetch price rules' }));
		throw new Error(errorData.message || 'Failed to fetch price rules');
	}
	const data = await response.json();
	const items: PriceRule[] = data.items ?? [];
	return items.filter((r) => r.is_active !== false);
}

export async function createPriceRule(data: Partial<PriceRule>): Promise<PriceRule> {
	const response = await fetch(`${API_BASE_URL}/collections/price_rules/records`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
		body: JSON.stringify(data)
	});
	if (!response.ok) {
		const errorData = await response.json().catch(() => ({ message: 'Failed to create price rule' }));
		throw new Error(errorData.message || 'Failed to create price rule');
	}
	return response.json();
}

export async function updatePriceRule(id: string, data: Partial<PriceRule>): Promise<PriceRule> {
	const response = await fetch(`${API_BASE_URL}/collections/price_rules/records/${id}`, {
		method: 'PATCH',
		headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
		body: JSON.stringify(data)
	});
	if (!response.ok) {
		const errorData = await response.json().catch(() => ({ message: 'Failed to update price rule' }));
		throw new Error(errorData.message || 'Failed to update price rule');
	}
	return response.json();
}

export async function deletePriceRule(id: string): Promise<void> {
	const response = await fetch(`${API_BASE_URL}/collections/price_rules/records/${id}`, {
		method: 'DELETE',
		headers: {
			...getAuthHeader()
		}
	});
	if (!response.ok) {
		try {
			const errorData = await response.json();
			throw new Error(errorData.message || 'Failed to delete price rule');
		} catch (e) {
			throw new Error('Failed to delete price rule');
		}
	}
}
