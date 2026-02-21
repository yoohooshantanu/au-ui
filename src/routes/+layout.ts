import { browser } from '$app/environment';
import { user } from '$lib/stores/auth';
import { redirect } from '@sveltejs/kit';
import { get } from 'svelte/store';
import type { LayoutLoad } from './$types';

export const ssr = false;

export const load: LayoutLoad = ({ url }) => {
	if (!browser) return;

	const isLoggedIn = get(user) !== null;
	const { pathname } = url;

	if (isLoggedIn && pathname === '/dashboard/login') {
		throw redirect(307, '/dashboard');
	}

	if (!isLoggedIn && pathname !== '/dashboard/login') {
		throw redirect(307, '/dashboard/login');
	}

	return {};
};