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
		body: JSON.stringify(payload)
	});
	if (!response.ok) {
		const err = await response.json().catch(() => ({}));
		throw new Error(err.message || 'Failed to create POC user');
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
