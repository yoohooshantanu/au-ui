import { API_BASE_URL } from './config';
import { authFetch } from '$lib/auth';

export interface CityCenter {
	id?: string;
	city: string;
	centers: string[]; // JSON array of center names
	created?: string;
	updated?: string;
}

export async function getCityCenters(customFetch?: typeof fetch): Promise<CityCenter[]> {
	// Use regular fetch for city centers as it should be public data
	const fetchFn = customFetch || fetch;
	const response = await fetchFn(`${API_BASE_URL}/collections/city_centers/records?perPage=200`);
	if (!response.ok) throw new Error('Failed to fetch city-centers mapping');
	const data = await response.json();
	return data.items ?? [];
}

export async function upsertCityCenters(payload: Omit<CityCenter, 'id' | 'created' | 'updated'>[]): Promise<CityCenter[]> {
	// Simple bulk upsert: delete all then recreate
	await fetch(`${API_BASE_URL}/collections/city_centers/records`, { method: 'DELETE' });
	const results = await Promise.all(
		payload.map(item =>
			fetch(`${API_BASE_URL}/collections/city_centers/records`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(item)
			}).then(r => {
				if (!r.ok) throw new Error('Failed to create city-center mapping');
				return r.json();
			})
		)
	);
	return results;
}

// Seed data for the 6 cities provided by the user
export const SEED_CITY_CENTERS: Omit<CityCenter, 'id' | 'created' | 'updated'>[] = [
	{
		city: 'Allahabad',
		centers: ['Naini', 'Jhunsi - 1', 'Jhunsi - 2', 'Bamrauli', 'Sancho', 'Teliyerganj']
	},
	{
		city: 'Aligarh',
		centers: ['Eath chungi', 'Nivri Mod', 'Nagla Giridhari', 'Tala nagri']
	},
	{
		city: 'Agra',
		centers: ['Madhu Nagar', 'Taddy bagiya', 'Bichpuri', 'Dauki', 'Cantt', 'Raunakta']
	},
	{
		city: 'Bareilly',
		centers: ['Kara', 'Nakatiya', 'Kunatanda', 'Bhuta', 'Banijariya', 'Faiznagar']
	},
	{
		city: 'Dehradun',
		centers: ['Sabhawala', 'Langha Road', 'Shankarpur']
	},
	{
		city: 'Meerut',
		centers: [
			'Badholi', 'Atrada', 'Bijoli', 'Mundali', 'Javri', 'Rotha', 'Jisori',
			'Kharkhoda', 'Pahadpur', 'Mohadinpure', 'Kathwari', 'Kishanpur'
		]
	}
];
