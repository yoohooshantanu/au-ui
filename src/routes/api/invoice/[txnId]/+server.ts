import { PAYU_KEY, PAYU_SALT, PB_ADMIN_EMAIL, PB_ADMIN_PASSWORD } from '$env/static/private';
import { generateInvoicePDF } from '$lib/server/pdfGenerator';
import { error } from '@sveltejs/kit';

const PB_URL = 'http://127.0.0.1:8090';

export async function GET({ params }) {
	const txnId = params.txnId;
	if (!txnId) throw error(400, 'Transaction ID missing');

	try {
		// Retrieve PocketBase Admin Token to bypass guest restrictions
		let adminToken = '';
		if (PB_ADMIN_EMAIL && PB_ADMIN_PASSWORD) {
			try {
				const authRes = await fetch(`${PB_URL}/api/admins/auth-with-password`, {
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

        // Fetch the intent from PocketBase
		const intentRes = await fetch(`${PB_URL}/api/collections/payment_intents/records?filter=(txn_id='${txnId}')&perPage=1`, { headers: pbHeaders });
		const intentData = await intentRes.json();

		if (!intentData.items || intentData.items.length === 0) {
			throw error(404, 'Payment trace not found');
		}

		const intent = intentData.items[0];

        // Ensure this transaction is actually successful before providing an invoice
        if (intent.status !== 'success') {
            throw error(403, 'Invoice unavailable: transaction pending or failed.');
        }

		const invoiceData = {
			transactionId: intent.txn_id,
			subscriberName: intent.first_name || 'Subscriber',
			amount: intent.amount.toString(),
			productInfo: intent.product_info || 'Subscription Payment',
			date: new Date(intent.updated).toLocaleDateString('en-IN')
		};

		const pdfBuffer = await generateInvoicePDF(invoiceData);

		return new Response(pdfBuffer, {
			headers: {
				'Content-Type': 'application/pdf',
				'Content-Disposition': `inline; filename="Invoice_${txnId}.pdf"`
			}
		});
	} catch (err: any) {
		console.error('Invoice generation error:', err);
		throw error(err.status || 500, err.message || 'Internal Server Error');
	}
}
