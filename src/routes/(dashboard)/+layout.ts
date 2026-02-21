import { browser } from '$app/environment';
import { goto } from '$app/navigation';
import { isLoggedIn } from '$lib/stores/auth';
import { get } from 'svelte/store';

export const load = () => {
    if (browser && !get(isLoggedIn)) {
        goto('/dashboard/login');
    }
};