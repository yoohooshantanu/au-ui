import { getDashboardStats } from '$lib/api/dashboard';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch }) => {
	try {
		// Create a wrapper that adds the full URL for server-side requests
		const serverFetch = (input: RequestInfo | URL, init?: RequestInit) => {
			const url = input instanceof URL ? input.toString() : (typeof input === 'string' ? input : input.toString());
			const fullUrl = url.startsWith('/api') ? `http://10.59.51.124:8090${url}` : url;
			return fetch(fullUrl, init);
		};

		const stats = await getDashboardStats(serverFetch);
		return {
			stats
		};
	} catch (error) {
		console.error('Failed to load dashboard stats:', error);
		return {
			stats: null,
			error: 'Could not load dashboard data.'
		};
	}
};