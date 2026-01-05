import type { PageServerLoad } from './$types';
import { getLookups } from '$lib/api/dashboard'; // <-- FIXED: Renamed from getUnitsLookup
import { getSubscribers } from '$lib/api/subscribers';
import { getPaymentCycles } from '$lib/api/payment_cycles';

export const load: PageServerLoad = async ({ url, fetch }) => {
	// Extract all possible filter and pagination parameters from the URL
	const page = Number(url.searchParams.get('page') ?? 1);
	const search = url.searchParams.get('search') ?? undefined;
	const city = url.searchParams.get('city') ?? undefined;
	const unit = url.searchParams.get('unit') ?? undefined; // <-- ADDED
	const pincode = url.searchParams.get('pincode') ?? undefined; // <-- ADDED
	const center_name = url.searchParams.get('center_name') ?? undefined; // <-- ADDED
	const landmark = url.searchParams.get('landmark') ?? undefined; // <-- ADDED
	const has_due_payment = url.searchParams.get('has_due_payment') === 'true'; // <-- ADDED

	// Create a wrapper that adds the full URL for server-side requests
	const serverFetch = (input: RequestInfo | URL, init?: RequestInit) => {
		const url = input instanceof URL ? input.toString() : (typeof input === 'string' ? input : input.toString());
		const fullUrl = url.startsWith('/api') ? `http://10.59.51.124:8090${url}` : url;
		return fetch(fullUrl, init);
	};

	try {
		const lookupsPromise = getLookups(serverFetch);
		let subscriberIds: string[] | undefined = undefined;

		if (has_due_payment) {
			const dueCycles = await getPaymentCycles({ is_due: true, perPage: 500 }, serverFetch);
			const ids = Array.from(
				new Set(
					(dueCycles.items ?? [])
						.map((cycle) => cycle?.subscriber)
						.filter((id): id is string => Boolean(id))
				)
			);
			subscriberIds = ids.length > 0 ? ids : ['__none__']; // '__none__' will force an empty result set
		}

		const subscribersData =
			has_due_payment && subscriberIds?.[0] === '__none__'
				? {
						page: 1,
						perPage: 25,
						totalItems: 0,
						totalPages: 1,
						items: []
				  }
				: await getSubscribers({
						page,
						search,
						city,
						unit,
						pincode,
						center_name,
						landmark,
						subscriberIds: subscriberIds?.[0] === '__none__' ? [] : subscriberIds
				  }, serverFetch);

		const lookups = await lookupsPromise; // <-- FIXED: Call the correct function

		// Return the successfully fetched data to the page component
		return {
			subscribersData,
			lookups,
			error: null // Explicitly return no error
		};
	} catch (error: any) {
		// If an error occurs (e.g., the API is down), log it on the server
		console.error('Failed to load subscribers page data:', error);
		
		// And return a structured error object to the page component
		return {
			subscribersData: null,
			lookups: null,
			error: error.message || 'Could not load subscribers.'
		};
	}
};