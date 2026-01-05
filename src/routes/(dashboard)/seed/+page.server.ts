import type { Actions, PageServerLoad } from './$types';
import { seedCityCenters } from '$lib/api/seed';
import { fail } from '@sveltejs/kit';

export const load: PageServerLoad = async () => {
	return { success: true, message: 'Seeding helpers available. Click button to run.' };
};

export const actions: Actions = {
	default: async () => {
		try {
			const seeded = await seedCityCenters();
			return { success: true, message: `Seeded ${seeded.length} city-centers mappings.` };
		} catch (e: any) {
			return fail(500, { success: false, error: e.message });
		}
	}
};
