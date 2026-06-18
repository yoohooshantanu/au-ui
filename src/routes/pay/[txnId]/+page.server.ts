import { PAYU_KEY, PAYU_SALT, PB_ADMIN_EMAIL, PB_ADMIN_PASSWORD } from '$env/static/private';
import { error } from '@sveltejs/kit';
import crypto from 'crypto';

// If PocketBase runs locally on 8090, use this as internal endpoint.
const PB_URL = 'http://127.0.0.1:8090';

export async function load({ params }) {
	const txnId = params.txnId;

	try {
		// Retrieve PocketBase Admin Token to bypass guest restrictions
		let adminToken = '';
		if (PB_ADMIN_EMAIL && PB_ADMIN_PASSWORD) {
			try {
				const authRes = await fetch(`${PB_URL}/api/collections/_superusers/auth-with-password`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						identity: PB_ADMIN_EMAIL,
						password: PB_ADMIN_PASSWORD
					})
				});
				const authData = await authRes.json();
				adminToken = authData?.token || '';
			} catch (err) {
				console.error("PocketBase Admin Authentication Failed.");
			}
		}

		const pbHeaders = {
			'Content-Type': 'application/json',
			...(adminToken ? { 'Authorization': `Bearer ${adminToken}` } : {})
		};

		// Fetch payment intent data from PocketBase directly
		const response = await fetch(`${PB_URL}/api/collections/payment_intents/records?filter=(txn_id='${txnId}')&perPage=1`, { headers: pbHeaders });
		
		if (!response.ok) {
			throw error(500, 'Failed to fetch payment details from database.');
		}

		const data = await response.json();
		if (!data.items || data.items.length === 0) {
			throw error(404, 'Payment transaction not found.');
		}

		const paymentData = data.items[0];

		// Use the secure .env credentials
		const key = PAYU_KEY;
		const salt = PAYU_SALT;

		if (!key || !salt) {
			throw error(500, 'Payment Gateway is not configured correctly on the server.');
		}

		// Required Payment Variables
		const amount = paymentData.amount.toString();
		const productInfo = paymentData.product_info;
		const firstName = paymentData.first_name;
		const email = paymentData.email || 'noemail@example.com';
		const udf1 = '';
		const udf2 = '';
		const udf3 = '';
		const udf4 = '';
		const udf5 = '';

		// Formula: key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5||||||SALT
		// The string specifically requires 11 pipes ||||||||||| before the salt if udfs are empty.
		const hashString = `${key}|${paymentData.txn_id}|${amount}|${productInfo}|${firstName}|${email}|${udf1}|${udf2}|${udf3}|${udf4}|${udf5}||||||${salt}`;

		// Generate secure SHA-512 Server-Side hash
		const hash = crypto.createHash('sha512').update(hashString).digest('hex');

		return {
			paymentData,
			payuKey: key,
			payuHash: hash,
		};

	} catch (err: any) {
		console.error("Payment load error:", err);
		throw error(err.status || 500, err.body?.message || 'Failed to load payment page');
	}
}
