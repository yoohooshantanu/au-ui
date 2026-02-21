import type { PageLoad } from './$types';
import { getDashboardStats } from '$lib/api/dashboard';

// Disable Server-Side Rendering so we can access localStorage for Auth
export const ssr = false;

export const load: PageLoad = async () => {
    try {
        // No arguments passed -> uses authFetch by default
        const stats = await getDashboardStats();
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
