		import { API_BASE_URL } from './api/config';
		import { getAuthHeader } from './auth';
		import { base } from '$app/paths';

		// ============================================
		// PayU Configuration
		// ============================================

		// Changed to Production URL since the provided key is a Production Key
		export const PAYU_CONFIG = {
			baseUrl: 'https://secure.payu.in/_payment',

			// After payment, PayU POSTs the receipt here for backend processing
			get successUrl() {
				return `${typeof window !== 'undefined' ? window.location.origin : ''}${base}/api/payu/response`;
			},
			get failureUrl() {
				return `${typeof window !== 'undefined' ? window.location.origin : ''}${base}/api/payu/response`;
			}
		};

		// ============================================
		// Note: SHA-512 Hash Generation has been migrated to
		// server-side SvelteKit endpoints for security.
		// You will find the secure hash logic in `api/payu/create-payment` and `pay/[txnId]/+page.server.ts`
		// ============================================

		/**
		 * Build the full PayU payment link URL that the reader can open
		 * This points to our own /pay/[txnId] page which auto-submits to PayU
		 */
		export function buildPaymentPageUrl(txnId: string): string {
			if (typeof window !== 'undefined') {
				return `${window.location.origin}${base}/pay/${txnId}`;
			}
			return `${base}/pay/${txnId}`;
		}

		export interface PayUPaymentData {
			txnId: string;
			amount: string;
			productInfo: string;
			firstName: string;
			email: string;
			phone: string;
			subscriberId: string;
			cycleId: string;
		}

		/**
		 * Save payment data to PocketBase so the /pay/[txnId] page can retrieve it
		 */
		export async function savePaymentIntent(data: PayUPaymentData): Promise<void> {
			const response = await fetch(`${API_BASE_URL}/collections/payment_intents/records`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
				body: JSON.stringify({
					txn_id: data.txnId,
					amount: data.amount.toString(),
					product_info: data.productInfo,
					first_name: data.firstName,
					email: data.email,
					phone: data.phone,
					subscriber: data.subscriberId,
					payment_cycle: data.cycleId,
					status: 'pending'
				})
			});
			if (!response.ok) {
				throw new Error('Failed to save payment intent');
			}
		}

		/**
		 * Fetch payment intent data by txn_id
		 */
		export async function getPaymentIntent(txnId: string): Promise<any> {
			const response = await fetch(
				`${API_BASE_URL}/collections/payment_intents/records?filter=(txn_id='${txnId}')&perPage=1`,
				{
					headers: { ...getAuthHeader() }
				}
			);
			if (!response.ok) throw new Error('Failed to fetch payment intent');
			const data = await response.json();
			if (!data.items || data.items.length === 0) throw new Error('Payment not found');
			return data.items[0];
		}	
