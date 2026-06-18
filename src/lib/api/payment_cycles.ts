	import { API_BASE_URL } from './config';
	import { authFetch } from '$lib/auth';

	// --- TYPE DEFINITIONS ---

	export interface PaymentCycle {
		id: string;
		subscriber: string;
		start_date: string;
		end_date: string;
		amount: number;
		is_due: boolean;
		coupon_amount: number;
		is_flagged: boolean;
		amount_paid: number;
		payment_mode: string;
		last_payment: string | null;
		product_code: string;
		note: string | null;
		invoice_link: string | null;
		payment_link: string | null;
		created: string;
		updated: string;
		subscriber_details?: {
			id: string;
			name: string;
			phone: string;
			unit: string;
			city: string;
			center_name?: string;
		};
		collector_details?: {
			id: string;
			name: string;
		};
	}

	export interface PaginatedPaymentCycles {
		page: number;
		perPage: number;
		totalItems: number;
		totalPages: number;
		items: PaymentCycle[];
	}

	// --- API FUNCTIONS ---

	export async function getPaymentCycles(
		params: {
			page?: number;
			perPage?: number;
			is_due?: boolean | null;
			month?: string;
			subscriber?: string;
			search?: string;
			center?: string;
			centerFilter?: string[];
		} = {},
		customFetch?: typeof fetch
	): Promise<PaginatedPaymentCycles> {
		const query = new URLSearchParams();

		if (params.page) query.set('page', params.page.toString());
		if (params.perPage) query.set('perPage', params.perPage.toString());
		if (params.subscriber) query.set('subscriber', params.subscriber);

		const filters: string[] = [];

		function quote(value: string) {
			return `'${value.replace(/'/g, "\\'")}'`;
		}

		if (params.is_due !== null && params.is_due !== undefined) {
			filters.push(`is_due = ${params.is_due}`);
		}

		if (params.month) {
			const monthPrefix = quote(`${params.month}-`);
			filters.push(`start_date ~ ${monthPrefix}`);
		}

		if (params.search) {
			const term = quote(params.search);
			filters.push(`(subscriber.name ~ ${term} || subscriber.phone ~ ${term})`);
		}
		
		if (params.center && params.center !== 'ALL') {
			const centersList = params.center.split(',').map(c => c.trim()).filter(Boolean);
			if (centersList.length > 0) {
				const centerSubset = centersList.map((c) => `subscriber.center_name = ${quote(c)}`).join(' || ');
				filters.push(`(${centerSubset})`);
			}
		}

		if (params.centerFilter && params.centerFilter.length > 0 && !params.centerFilter.includes('ALL')) {
			const centerSubset = params.centerFilter.map((c) => `subscriber.center_name = ${quote(c)}`).join(' || ');
			filters.push(`(${centerSubset})`);
		}

		if (filters.length > 0) {
			query.set('filter', filters.join(' && '));
		}

		query.set('expand', 'subscriber,collected_by');
		query.set('sort', '-created');

		const response = await authFetch(`${API_BASE_URL}/collections/payment_cycles/records?${query.toString()}`, {}, customFetch);
		if (!response.ok) {
			throw new Error('Failed to fetch payment cycles');
		}
		const data = await response.json();
		if (data.items) {
			data.items = data.items.map((item: any) => ({
				...item,
				subscriber_details: item.expand?.subscriber,
				collector_details: item.expand?.collected_by
			}));
		}
		return data;
	}

	export async function createPaymentCycle(data: Partial<PaymentCycle>): Promise<PaymentCycle> {
		const response = await authFetch(`${API_BASE_URL}/collections/payment_cycles/records`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(data)
		});
		if (!response.ok) {
			const errorData = await response.json();
			throw new Error(errorData.message || 'Failed to create payment cycle');
		}
		return response.json();
	}

	export async function updatePaymentCycle(id: string, data: Partial<PaymentCycle>): Promise<PaymentCycle> {
		const response = await authFetch(`${API_BASE_URL}/collections/payment_cycles/records/${id}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(data)
		});
		if (!response.ok) {
			const errorData = await response.json();
			throw new Error(errorData.message || 'Failed to update payment cycle');
		}
		return response.json();
	}

	export async function deletePaymentCycle(id: string): Promise<void> {
		const response = await authFetch(`${API_BASE_URL}/collections/payment_cycles/records/${id}`, {
			method: 'DELETE'
		});
		if (!response.ok) {
			try {
				const errorData = await response.json();
				throw new Error(errorData.message || 'Failed to delete payment cycle');
			} catch (e) {
				throw new Error('Failed to delete payment cycle');
			}
		}
	}