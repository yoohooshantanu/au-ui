import { env } from '$env/dynamic/private';
const { PAYU_KEY, PAYU_SALT, PB_ADMIN_EMAIL, PB_ADMIN_PASSWORD } = env;
import crypto from 'crypto';
import { sendInvoiceSMS } from '$lib/server/sms';
import { base } from '$app/paths';

const PB_URL = 'http://127.0.0.1:8090';

export async function POST({ request }) {
    try {
        const formData = await request.formData();
        
        const txnid = formData.get('txnid') as string || '';
        const amount = formData.get('amount') as string || '';
        const productinfo = formData.get('productinfo') as string || '';
        const firstname = formData.get('firstname') as string || '';
        const email = formData.get('email') as string || '';
        const status = formData.get('status') as string || '';
        const payuHash = formData.get('hash') as string || '';
        
        const key = PAYU_KEY;
        const salt = PAYU_SALT;
        
        if (!key || !salt) {
            console.error('PayU credentials not     ured');
            return new Response(null, { status: 302, headers: { Location: `${base}/pay/failure?reason=config_error` } });
        }

        // 1. Verify Reverse Hash
        // Formula: SALT|status||||||udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key
        const udf1 = '';
        const udf2 = '';
        const udf3 = '';
        const udf4 = '';
        const udf5 = '';
        const hashString = `${salt}|${status}||||||${udf5}|${udf4}|${udf3}|${udf2}|${udf1}|${email}|${firstname}|${productinfo}|${amount}|${txnid}|${key}`;
        
        const generatedHash = crypto.createHash('sha512').update(hashString).digest('hex');

        if (generatedHash !== payuHash) {
            console.error('PayU reverse hash validation failed!', { txnid, status });
            return new Response(null, { status: 302, headers: { Location: `${base}/pay/failure?reason=hash_mismatch` } });
        }
        
        // Retrieve PocketBase Admin Token for secure updates
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
        const pbPatchHeaders = {
            'Content-Type': 'application/json',
            ...(adminToken ? { 'Authorization': `Bearer ${adminToken}` } : {})
        };

        if (status === 'success') {
            // 2. Fetch the payment intent from PocketBase
            const intentRes = await fetch(`${PB_URL}/api/collections/payment_intents/records?filter=(txn_id='${txnid}')&perPage=1`);
            const intentData = await intentRes.json();
            
            if (intentData.items && intentData.items.length > 0) {
                const intent = intentData.items[0];
                
                // --- FIX 2: Idempotency Check ---
                if (intent.status === 'success') {
                    // Already processed, prevent duplicate SMS and DB calls
                    return new Response(null, { status: 302, headers: { Location: `${base}/pay/success` } });
                }

                // --- FIX 3: Amount Validation ---
                if (Number(amount) !== Number(intent.amount)) {
                    console.error(`Tampered amount detected! DB Expected: ${intent.amount}, Hook Sent: ${amount}`);
                    return new Response(null, { status: 302, headers: { Location: `${base}/pay/failure?reason=amount_mismatch` } });
                }
                
                // 3. Mark intent as successful
                // --- FIX 1: Using pbPatchHeaders with Admin Auth ---
                await fetch(`${PB_URL}/api/collections/payment_intents/records/${intent.id}`, {
                    method: 'PATCH',
                    headers: pbPatchHeaders,
                    body: JSON.stringify({ status: 'success' })
                });

                // 4. Update the related payment cycle
                if (intent.payment_cycle) {
                    await fetch(`${PB_URL}/api/collections/payment_cycles/records/${intent.payment_cycle}`, {
                        method: 'PATCH',
                        headers: pbPatchHeaders,
                        body: JSON.stringify({
                            is_due: false,
                            amount_paid: amount,
                            payment_mode: 'online',
                            last_payment: new Date().toISOString()
                        })
                    });
                }
                
                // 5. Send Notification SMS with Invoice Link
                try {
                    const subscriberName = firstname || intent.first_name || 'Subscriber';
                    const hostUrl = request.headers.get('origin') || process.env.PUBLIC_BASE_URL || 'http://localhost:5173';
                    const invoiceUrl = `${hostUrl}${base}/api/invoice/${txnid}`;
                    
                    const phone = intent.phone;
                    if (phone) {
                        await sendInvoiceSMS(phone, subscriberName, amount, invoiceUrl);
                    } else {
                        console.error('No phone number found to send invoice SMS to.');
                    }
                } catch (smsErr) {
                    console.error('Failed to send invoice SMS:', smsErr);
                }
            }

            return new Response(null, { status: 302, headers: { Location: `${base}/pay/success` } });
        } else {
            // Transaction failed or cancelled
            const intentRes = await fetch(`${PB_URL}/api/collections/payment_intents/records?filter=(txn_id='${txnid}')&perPage=1`);
            const intentData = await intentRes.json();
            
            if (intentData.items && intentData.items.length > 0) {
                const intent = intentData.items[0];
                await fetch(`${PB_URL}/api/collections/payment_intents/records/${intent.id}`, {
                    method: 'PATCH',
                    headers: pbPatchHeaders, // Using Admin Auth
                    body: JSON.stringify({ status: 'failed' })
                });
            }

            return new Response(null, { status: 302, headers: { Location: `${base}/pay/failure` } });
        }

    } catch (err) {
        console.error('Error handling PayU webhook:', err);
        return new Response(null, { status: 302, headers: { Location: `${base}/pay/failure?reason=server_error` } });
    }
}
