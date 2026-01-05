import { API_BASE_URL } from './config';

// Seed the city_centers collection with the provided data
export async function seedCityCenters() {
	const SEED = [
		{ city: 'Allahabad', centers: ['Naini', 'Jhunsi - 1', 'Jhunsi - 2', 'Bamrauli', 'Sancho', 'Teliyerganj'] },
		{ city: 'Aligarh', centers: ['Eath chungi', 'Nivri Mod', 'Nagla Giridhari', 'Tala nagri'] },
		{ city: 'Agra', centers: ['Madhu Nagar', 'Taddy bagiya', 'Bichpuri', 'Dauki', 'Cantt', 'Raunakta'] },
		{ city: 'Bareilly', centers: ['Kara', 'Nakatiya', 'Kunatanda', 'Bhuta', 'Banijariya', 'Faiznagar'] },
		{ city: 'Dehradun', centers: ['Sabhawala', 'Langha Road', 'Shankarpur'] },
		{ city: 'Meerut', centers: ['Badholi', 'Atrada', 'Bijoli', 'Mundali', 'Javri', 'Rotha', 'Jisori', 'Kharkhoda', 'Pahadpur', 'Mohadinpure', 'Kathwari', 'Kishanpur'] }
	];

	// Clear existing records (simple delete-all for seeding)
	try {
		await fetch(`${API_BASE_URL}/collections/city_centers/records`, { method: 'DELETE' });
	} catch (e) {
		// Ignore if collection doesn't exist yet
	}

	// Insert seed data
	const results = await Promise.all(
		SEED.map(item =>
			fetch(`${API_BASE_URL}/collections/city_centers/records`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(item)
			}).then(r => {
				if (!r.ok) throw new Error(`Failed to seed city: ${item.city}`);
				return r.json();
			})
		)
	);
	return results;
}

// One‑time helper to ensure required collections exist (call this from a migration script or admin page)
export async function ensureInventorySchema() {
	// Ensure collections exist; PocketBase UI can also be used to create them.
	// This function is optional and mainly for documentation.
	const collections = [
		{
			name: 'inventory_allocations',
			type: 'base',
			schema: [
				{ name: 'center', type: 'text', required: true },
				{ name: 'date', type: 'date', required: true },
				{ name: 'quantity', type: 'number', required: true },
				{ name: 'added_by', type: 'text', required: true }
			]
		},
		{
			name: 'city_centers',
			type: 'base',
			schema: [
				{ name: 'city', type: 'text', required: true, unique: true },
				{ name: 'centers', type: 'json', required: true }
			]
		}
	];
	// Note: Actual collection creation must be done via PocketBase UI or API with admin token.
	console.info('Ensure these collections exist in PocketBase:', collections);
	return collections;
}
