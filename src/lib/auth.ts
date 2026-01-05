import { page } from '$app/stores';
import { browser } from '$app/environment';

export interface AuthUser {
	id: string;
	email: string;
	name: string;
	unit: string;
	city?: string;
	centers?: string[];
}

// Get current user from localStorage or auth store
export function getCurrentUser(): AuthUser | null {
	if (!browser) return null;
	
	// Check for authToken first
	const token = localStorage.getItem('authToken');
	if (!token) return null;
	
	// Try to get user from different possible storage keys
	try {
		// Check common storage keys
		const userKeys = ['authUser', 'user', 'pocketbase_auth'];
		for (const key of userKeys) {
			const data = localStorage.getItem(key);
			if (data) {
				const parsed = JSON.parse(data);
				// Handle different auth response formats
				const user = parsed.user || parsed.record || parsed;
				if (user && user.id) {
					return user;
				}
			}
		}
	} catch {
		return null;
	}
	
	return null;
}

// Check if user is admin (has ALL access or is superuser)
export function isAdmin(user: AuthUser | null = null): boolean {
	if (!user) user = getCurrentUser();
	if (!user) return false;
	
	// Superuser check (you might have a flag like user.superuser)
	if ((user as any).superuser) return true;
	
	// Check for ALL access
	return user.unit === 'ALL' && (user.city === 'ALL' || !user.city);
}

// Check if user can view inventory (all authenticated users)
export function canViewInventory(user: AuthUser | null = null): boolean {
	return !!getCurrentUser(); // Any logged-in user can view
}

// Check if user can edit inventory (admin only)
export function canEditInventory(user: AuthUser | null = null): boolean {
	return isAdmin(user);
}

// Check if user can access AU POC page (admin only)
export function canManagePocs(user: AuthUser | null = null): boolean {
	return isAdmin(user);
}

// Check if user can add/edit subscribers (all authenticated users)
export function canEditSubscribers(user: AuthUser | null = null): boolean {
	return !!getCurrentUser(); // Any logged-in user can add/edit
}

// Check if user can delete subscribers (admin only)
export function canDeleteSubscribers(user: AuthUser | null = null): boolean {
	return isAdmin(user);
}

// Check if user can access specific unit/city/center
export function canAccess(params: { unit?: string; city?: string; center?: string }, user: AuthUser | null = null): boolean {
	if (!user) user = getCurrentUser();
	if (!user) return false;
	
	// Admins can access everything
	if (isAdmin(user)) return true;
	
	// Check unit access
	if (params.unit && user.unit !== params.unit && user.unit !== 'ALL') {
		return false;
	}
	
	// Check city access
	if (params.city && user.city !== params.city && user.city !== 'ALL' && !user.city) {
		return false;
	}
	
	// Check center access
	if (params.center && user.centers && !user.centers.includes(params.center) && user.unit !== 'ALL') {
		return false;
	}
	
	return true;
}

// Get auth headers for API requests
export function getAuthHeader(): Record<string, string> {
	if (!browser) return {};
	const token = localStorage.getItem('authToken');
	if (!token) return {};
	return { Authorization: `Bearer ${token}` };
}

// Wrapper for fetch that includes auth and handles permissions
export async function authFetch(url: string, options: RequestInit = {}, customFetch?: typeof fetch): Promise<Response> {
	const headers = {
		'Content-Type': 'application/json',
		...getAuthHeader(),
		...options.headers
	};
	
	// Use customFetch if provided (for server-side), otherwise use global fetch
	const fetchFn = customFetch || fetch;
	
	const response = await fetchFn(url, { ...options, headers });
	
	// Handle 401/403 globally if needed
	if (response.status === 401 || response.status === 403) {
		// Could redirect to login or show permission denied
		console.warn('Authentication or authorization failed');
	}
	
	return response;
}
