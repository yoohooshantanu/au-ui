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

		// Use customFetch if provided, otherwise use global fetch
		const fetchFn = customFetch || fetch;

		// Fetch subscribers
		const subscribersResponse = await fetchFn(`${API_BASE_URL}/collections/subscribers/records?perPage=1000`);
		if (!subscribersResponse.ok) throw new Error('Failed to fetch subscribers');
		const subscribersData = await subscribersResponse.json();
		const subscribers = subscribersData.items || [];

		// Fetch payment cycles
		const paymentCyclesResponse = await fetchFn(`${API_BASE_URL}/collections/payment_cycles/records?perPage=1000`);
		if (!paymentCyclesResponse.ok) throw new Error('Failed to fetch payment cycles');
		const paymentCyclesData = await paymentCyclesResponse.json();
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
		// Fetch all subscribers to extract unique values
		const response = await authFetch(`${API_BASE_URL}/collections/subscribers/records?perPage=1000`, {}, customFetch);
		if (!response.ok) {
			console.warn('Failed to fetch subscribers for lookups');
			return { units: [], cities: [], center_names: [], landmarks: [] };
		}
		
		const data = await response.json();
		const subscribers: any[] = data.items || [];
		
		// Extract unique values with proper typing
		const units = [...new Set(subscribers.map((s: any) => s.unit).filter(Boolean))] as string[];
		const cities = [...new Set(subscribers.map((s: any) => s.city).filter(Boolean))] as string[];
		const center_names = [...new Set(subscribers.map((s: any) => s.center_name).filter(Boolean))] as string[];
		const landmarks = [...new Set(subscribers.map((s: any) => s.landmark).filter(Boolean))] as string[];
		
		// Sort alphabetically
		units.sort();
		cities.sort();
		center_names.sort();
		landmarks.sort();
		
		return { units, cities, center_names, landmarks };
	} catch (error) {
		console.error('Error fetching lookups:', error);
		// Return empty lookups on error
		return { units: [], cities: [], center_names: [], landmarks: [] };
	}
}