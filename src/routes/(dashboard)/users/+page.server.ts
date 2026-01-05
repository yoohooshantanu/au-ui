import type { PageServerLoad } from './$types';
import { getLookups } from '$lib/api/dashboard';
import { getPocUsers, type PocUser } from '$lib/api/poc';
import { getCurrentUser, isAdmin } from '$lib/auth';
import { redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ fetch }) => {
	// Temporarily removing auth check for debugging
	console.log('AU POC page loading...');
	console.log('Fetching POC data...');

	try {
		// Create a wrapper that adds the full URL for server-side requests
		const serverFetch = (input: RequestInfo | URL, init?: RequestInit) => {
			const url = input instanceof URL ? input.toString() : (typeof input === 'string' ? input : input.toString());
			const fullUrl = url.startsWith('/api') ? `http://127.0.0.1:3001${url}` : url;
			return fetch(fullUrl, init);
		};

		const [users, lookups] = await Promise.all([
			getPocUsers(serverFetch),
			getLookups(serverFetch).catch(() => ({ units: [], cities: [], center_names: [], landmarks: [] }))
		]);
		return { users, lookups, error: null };
	} catch (e: any) {
		console.error('Failed to load AU POCs:', e);
		return { users: null, lookups: null, error: e.message || 'Could not load POCs' };
	}
};
