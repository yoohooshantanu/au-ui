import { API_BASE_URL } from './config';
import { authFetch } from '$lib/auth';

export interface PocUser {
	id?: string;
	name: string;
	email: string;
	unit: string;
	city?: string; // single city assigned
	centers?: string[]; // array of center names assigned
	password?: string;
	passwordConfirm?: string;
	created?: string;
	updated?: string;
}

export async function getPocUsers(customFetch?: typeof fetch): Promise<PocUser[]> {
	const response = await authFetch(`${API_BASE_URL}/collections/users/records`, {}, customFetch);
	if (!response.ok) throw new Error('Failed to fetch POC users');
	const data = await response.json();
	return data.items;
}

export async function createPocUser(payload: Omit<PocUser, 'id' | 'created' | 'updated'>): Promise<PocUser> {
	const response = await authFetch(`${API_BASE_URL}/collections/users/records`, {
		method: 'POST',
		body: JSON.stringify({ ...payload, emailVisibility: true })
	});
	if (!response.ok) {
		const err = await response.json().catch(() => ({}));
		console.error('PocketBase Create Error:', JSON.stringify(err, null, 2)); // Debug logging

		let errorMessage = err.message || 'Failed to create POC user';
		const error = new Error(errorMessage) as any;

		if (err.data && Object.keys(err.data).length > 0) {
			error.data = err.data;
		}

		throw error;
	}
	return response.json();
}

export async function updatePocUser(id: string, payload: Partial<PocUser>): Promise<PocUser> {
	const response = await authFetch(`${API_BASE_URL}/collections/users/records/${id}`, {
		method: 'PATCH',
		body: JSON.stringify(payload)
	});
	if (!response.ok) {
		const err = await response.json().catch(() => ({}));
		throw new Error(err.message || 'Failed to update POC user');
	}
	return response.json();
}

export async function deletePocUser(id: string): Promise<void> {
	const response = await authFetch(`${API_BASE_URL}/collections/users/records/${id}`, {
		method: 'DELETE'
	});
	if (!response.ok) throw new Error('Failed to delete POC user');
}
