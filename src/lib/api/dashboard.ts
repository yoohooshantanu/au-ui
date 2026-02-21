import { API_BASE_URL } from './config';
import { authFetch } from '$lib/auth';

// Defines the shape of the statistics object from your API
export interface DashboardStats {
	total_subscribers: number;
	total_due_amount: number;
	revenue_this_month: number;
	new_subscribers_this_month: number;
}

// --- UPDATED ---
// Defines the shape of the lookups object to include the new fields
export interface Lookups {
	units: string[];
	cities: string[];
	center_names: string[]; // <-- NEW
	landmarks: string[];    // <-- NEW
}

/**
 * Fetches the main statistics for the dashboard homepage.
 */
export async function getDashboardStats(customFetch?: typeof fetch): Promise<DashboardStats> {
	try {
		// Get current month dates
		const now = new Date();
		const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
		const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

		// Use authFetch to ensure API Rules are applied
		const fetchFn = customFetch || authFetch;

		// Fetch subscribers (API Rules will filter this for us automatically now)
		const subscribersResponse = await fetchFn(`${API_BASE_URL}/collections/subscribers/records?perPage=500`);

		// If 403/404 (due to permissions), treat as empty lists rather than crashing
		if (!subscribersResponse.ok) {
			console.warn('Dashboard stats fetch failed (likely permission)', subscribersResponse.status);
			return {
				total_subscribers: 0,
				total_due_amount: 0,
				revenue_this_month: 0,
				new_subscribers_this_month: 0
			};
		}

		const subscribersData = await subscribersResponse.json();
		const subscribers = subscribersData.items || [];

		// Fetch payment cycles
		const paymentCyclesResponse = await fetchFn(`${API_BASE_URL}/collections/payment_cycles/records?perPage=1000`);
		const paymentCyclesData = paymentCyclesResponse.ok ? await paymentCyclesResponse.json() : { items: [] };
		const paymentCycles = paymentCyclesData.items || [];

		// Calculate statistics
		const total_subscribers = subscribers.length;

		// Total due amount (sum of amounts where is_due is true)
		const total_due_amount = paymentCycles
			.filter((cycle: any) => cycle.is_due)
			.reduce((sum: number, cycle: any) => sum + (cycle.amount || 0), 0);

		// Revenue this month (sum of amounts with last_payment in current month)
		const revenue_this_month = paymentCycles
			.filter((cycle: any) => cycle.last_payment && cycle.last_payment >= monthStart && cycle.last_payment <= monthEnd)
			.reduce((sum: number, cycle: any) => sum + (cycle.amount || 0), 0);

		// New subscribers this month (count created in current month)
		const new_subscribers_this_month = subscribers
			.filter((sub: any) => sub.created >= monthStart && sub.created <= monthEnd)
			.length;

		return {
			total_subscribers,
			total_due_amount,
			revenue_this_month,
			new_subscribers_this_month
		};
	} catch (error) {
		console.error('Error fetching dashboard stats:', error);
		throw error;
	}
}

/**
 * --- UPDATED ---
 * Fetches unique values from existing subscribers table for dropdowns
 * Extracts unique units, cities, centers, and landmarks from subscriber records
 */
export async function getLookups(customFetch?: typeof fetch): Promise<Lookups> {
	try {
		const fetchFn = customFetch || fetch;

		// Fetch from multiple sources in parallel to be robust
		const [subscribersRes, citiesRes, centersRes] = await Promise.all([
			authFetch(`${API_BASE_URL}/collections/subscribers/records?perPage=200`, {}, fetchFn).catch(() => null),
			authFetch(`${API_BASE_URL}/collections/cities/records?perPage=100`, {}, fetchFn).catch(() => null),
			authFetch(`${API_BASE_URL}/collections/city_centers/records?perPage=200`, {}, fetchFn).catch(() => null)
		]);

		const units = new Set<string>();
		const cities = new Set<string>();
		const center_names = new Set<string>();
		const landmarks = new Set<string>();

		// 1. Extract from Cities Collection (Official List)
		if (citiesRes?.ok) {
			const data = await citiesRes.json();
			data.items?.forEach((item: any) => {
				if (item.name) cities.add(item.name);
				// Assuming cities have a 'unit' field, commonly the case
				if (item.unit) units.add(item.unit);
			});
		}

		// 2. Extract from City Centers Collection (Official List)
		if (centersRes?.ok) {
			const data = await centersRes.json();
			data.items?.forEach((item: any) => {
				// Try common field names for center name
				const name = item.name || item.center_name;
				if (name) center_names.add(name);
			});
		}

		// 3. Fallback/Augment with Subscriber Data (Historical usage)
		if (subscribersRes?.ok) {
			const data = await subscribersRes.json();
			const items = data.items || [];
			items.forEach((s: any) => {
				if (s.unit) units.add(s.unit);
				if (s.city) cities.add(s.city);
				if (s.center_name) center_names.add(s.center_name);
				if (s.landmark) landmarks.add(s.landmark);
			});
		}

		return {
			units: Array.from(units).sort(),
			cities: Array.from(cities).sort(),
			center_names: Array.from(center_names).sort(),
			landmarks: Array.from(landmarks).sort()
		};
	} catch (error) {
		console.error('Error fetching lookups:', error);
		return { units: [], cities: [], center_names: [], landmarks: [] };
	}
}