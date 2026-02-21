    import { API_BASE_URL } from './config';

/**
 * Creates a server-side fetch function that prepends the full API URL
 * for server-side rendering where relative URLs don't work.
 */
export function createServerFetch(origin?: string): typeof fetch {
	return async (input: RequestInfo | URL, init?: RequestInit) => {
		const url = input instanceof URL ? input.toString() : (typeof input === 'string' ? input : input.toString());
		
		// If URL starts with /api, prepend the internal server URL
		if (url.startsWith('/api')) {
			// On the server, connect directly to the internal PocketBase instance
			const fullUrl = `http://127.0.0.1:8090${url}`;
			return fetch(fullUrl, init);
		}
		
		// Otherwise, use the URL as-is
		return fetch(url, init);
	};
}
