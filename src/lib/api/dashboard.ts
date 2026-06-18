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
	cityToCenters?: Record<string, string[]>;
}

/**
 * Fetches the main statistics for the dashboard homepage.
 */
export async function getDashboardStats(customFetch?: typeof fetch, centerFilter?: string[]): Promise<DashboardStats> {
	try {
		// Get current month dates
		const now = new Date();
		const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
		const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

		// Use authFetch to ensure API Rules are applied
		const fetchFn = (url: string, options?: RequestInit) => authFetch(url, options, customFetch);

		// --- Fetch ALL subscribers using pagination ---
		let allSubscribers: any[] = [];
		let totalSubscriberCount = 0;
		let subPage = 1;
		while (true) {
			const subRes = await fetchFn(`${API_BASE_URL}/collections/subscribers/records?perPage=500&page=${subPage}`);
			if (!subRes.ok) {
				console.warn('Dashboard stats: subscribers fetch failed', subRes.status);
				break;
			}
			const subData = await subRes.json();
			const items = subData.items || [];
			allSubscribers.push(...items);
			totalSubscriberCount = subData.totalItems || allSubscribers.length;
			if (subPage >= (subData.totalPages || 1)) break;
			subPage++;
		}

		// --- Fetch ALL payment cycles using pagination ---
		let allPaymentCycles: any[] = [];
		let pcPage = 1;
		while (true) {
			const pcRes = await fetchFn(`${API_BASE_URL}/collections/payment_cycles/records?perPage=500&page=${pcPage}`);
			if (!pcRes.ok) break;
			const pcData = await pcRes.json();
			const items = pcData.items || [];
			allPaymentCycles.push(...items);
			if (pcPage >= (pcData.totalPages || 1)) break;
			pcPage++;
		}

		// Calculate statistics using the FULL dataset
		// If centerFilter is provided, filter subscribers and cycles by those centers
		let filteredSubscribers = allSubscribers;
		let filteredCycles = allPaymentCycles;

		if (centerFilter && centerFilter.length > 0 && !centerFilter.includes('ALL')) {
			filteredSubscribers = allSubscribers.filter((s: any) => centerFilter.includes(s.center_name));
			const filteredSubIds = new Set(filteredSubscribers.map((s: any) => s.id));
			filteredCycles = allPaymentCycles.filter((c: any) => filteredSubIds.has(c.subscriber));
			totalSubscriberCount = filteredSubscribers.length;
		}

		const total_subscribers = totalSubscriberCount;

		// Total due amount (sum of amounts where is_due is true)
		const total_due_amount = filteredCycles
			.filter((cycle: any) => cycle.is_due)
			.reduce((sum: number, cycle: any) => sum + (cycle.amount || 0), 0);

		// Revenue this month (sum of amounts with last_payment in current month)
		const revenue_this_month = filteredCycles
			.filter((cycle: any) => cycle.last_payment && cycle.last_payment >= monthStart && cycle.last_payment <= monthEnd)
			.reduce((sum: number, cycle: any) => sum + (cycle.amount || 0), 0);

		// New subscribers this month (count created in current month)
		const new_subscribers_this_month = filteredSubscribers
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
export async function getLookups(customFetch?: typeof fetch, centerFilter?: string[]): Promise<Lookups> {
	try {
		const fetchFn = customFetch || fetch;

		const units = new Set<string>();
		const cities = new Set<string>();
		const center_names = new Set<string>();
		const landmarks = new Set<string>();
		const cityToCentersMap: Record<string, Set<string>> = {};

		// 1. Extract from Cities Collection (Official List)
		const citiesRes = await authFetch(`${API_BASE_URL}/collections/cities/records?perPage=100`, {}, fetchFn).catch(() => null);
		if (citiesRes?.ok) {
			const data = await citiesRes.json();
			data.items?.forEach((item: any) => {
				if (item.name) cities.add(item.name);
				if (item.unit) units.add(item.unit);
			});
		}

		// 2. Extract from City Centers Collection (Official List)
		const centersRes = await authFetch(`${API_BASE_URL}/collections/city_centers/records?perPage=200`, {}, fetchFn).catch(() => null);
		if (centersRes?.ok) {
			const data = await centersRes.json();
			data.items?.forEach((item: any) => {
				const name = item.name || item.center_name;
				if (name) center_names.add(name);
			});
		}

		// 3. Fallback/Augment with Subscriber Data (Historical usage)
		// Fetch ALL subscribers
		let allSubscribers: any[] = [];
		let subPage = 1;
		while (true) {
			const subRes = await authFetch(`${API_BASE_URL}/collections/subscribers/records?perPage=500&page=${subPage}`, {}, fetchFn).catch(() => null);
			if (!subRes || !subRes.ok) break;
			const subData = await subRes.json();
			const items = subData.items || [];
			allSubscribers.push(...items);
			if (subPage >= (subData.totalPages || 1)) break;
			subPage++;
		}

		allSubscribers.forEach((s: any) => {
			if (s.unit) units.add(s.unit);
			if (s.city) cities.add(s.city);
			if (s.center_name) {
				center_names.add(s.center_name);
				if (s.city) {
					if (!cityToCentersMap[s.city]) cityToCentersMap[s.city] = new Set();
					cityToCentersMap[s.city].add(s.center_name);
				}
			}
			if (s.landmark) landmarks.add(s.landmark);
		});

		const cityToCenters: Record<string, string[]> = {};
		for (const [city, centers] of Object.entries(cityToCentersMap)) {
			cityToCenters[city] = Array.from(centers).sort();
		}

		return {
			units: Array.from(units).sort(),
			cities: Array.from(cities).sort(),
			center_names: Array.from(center_names).filter(c => !centerFilter || centerFilter.includes('ALL') || centerFilter.includes(c)).sort(),
			landmarks: Array.from(landmarks).sort(),
			cityToCenters
		};
	} catch (error) {
		console.error('Error fetching lookups:', error);
		return { units: [], cities: [], center_names: [], landmarks: [] };
	}
}