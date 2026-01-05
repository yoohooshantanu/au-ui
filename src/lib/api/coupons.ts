import { API_BASE_URL } from './config';

export interface Coupon {
	id: string;
	name: string;
	amount: number;
	is_active?: boolean;
	created?: string;
	updated?: string;
}

export async function getCoupons(): Promise<Coupon[]> {
	const response = await fetch(`${API_BASE_URL}/collections/coupons/records?perPage=200&sort=-created`);
	if (!response.ok) throw new Error('Failed to fetch coupons');
	const data = await response.json();
	return data.items || [];
}

export async function createCoupon(data: Partial<Coupon>): Promise<Coupon> {
	const response = await fetch(`${API_BASE_URL}/collections/coupons/records`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(data)
	});
	if (!response.ok) {
		const errorData = await response.json();
		throw new Error(errorData.message || 'Failed to create coupon');
	}
	return response.json();
}

export async function updateCoupon(id: string, data: Partial<Coupon>): Promise<Coupon> {
	const response = await fetch(`${API_BASE_URL}/collections/coupons/records/${id}`, {
		method: 'PATCH',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(data)
	});
	if (!response.ok) {
		const errorData = await response.json();
		throw new Error(errorData.message || 'Failed to update coupon');
	}
	return response.json();
}

export async function deleteCoupon(id: string): Promise<void> {
	const response = await fetch(`${API_BASE_URL}/collections/coupons/records/${id}`, {
		method: 'DELETE'
	});
	if (!response.ok) {
		try {
			const errorData = await response.json();
			throw new Error(errorData.message || 'Failed to delete coupon');
		} catch (e) {
			throw new Error('Failed to delete coupon');
		}
	}
}
