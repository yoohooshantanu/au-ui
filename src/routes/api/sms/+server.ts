import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';
const { SMS_API_USERNAME, SMS_API_PASSWORD } = env;

const VISPL_API_URL = 'https://bulksmsapi.vispl.in/';
const SENDER_ID = 'AMARED';
const ENTITY_ID = '1701158080315505109';

// Template Configurations
const TEMPLATES = {
	reminder: {
		contentId: '1707177821506648204',
		formatMessage: (vars: any) => 
			`REMINDER! ${vars.name} Month ${vars.month} Bill due ${vars.amount} and Total due ${vars.total} Due by ${vars.dueDate} - AMAR UJALA`
	},
	payment_link: {
		contentId: '1707178107043229335',
		formatMessage: (vars: any) => 
			`${vars.name}, your bill of Rs.${vars.amount} for ${vars.startDate} to ${vars.endDate} is due. Pay: https://disha.amarujaladigital.com/dashboard/pay/${vars.paymentCycleId}`
	}
};

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { phoneNumber, templateType, variables } = await request.json(); 

		if (!phoneNumber || !templateType || !variables) {
			return json({ error: 'Missing required parameters' }, { status: 400 });
		}

		const template = TEMPLATES[templateType as keyof typeof TEMPLATES];
		if (!template) {
			return json({ error: 'Invalid template type' }, { status: 400 });
		}

		const safeName = (variables.name || 'Subscriber').trim().replace(/\s+/g, ' ');
		const safeAmount = String(variables.amount || '0').trim();
		const safeStartDate = String(variables.startDate || '').trim();
		const safeEndDate = String(variables.endDate || '').trim();
		const safeMonth = String(variables.month || '').trim();
		const safeTotal = String(variables.total || '0').trim();
		const safeDueDate = String(variables.dueDate || '').trim();
		const safePaymentCycleId = String(variables.paymentCycleId || '').trim();

		// Update variables object with sanitized values
		const sanitizedVars = {
			name: safeName,
			amount: safeAmount,
			startDate: safeStartDate,
			endDate: safeEndDate,
			month: safeMonth,
			total: safeTotal,
			dueDate: safeDueDate,
			paymentCycleId: safePaymentCycleId
		};

		const message = template.formatMessage(sanitizedVars);
		
		const params = new URLSearchParams({
			username: SMS_API_USERNAME,
			password: SMS_API_PASSWORD,
			messageType: 'text',
			mobile: phoneNumber.replace(/\D/g, ''), // Strip non-digits
			senderId: SENDER_ID,
			ContentID: template.contentId,
			EntityID: ENTITY_ID,
			// Also include alternative DLT parameter names just in case VISPL uses them
			template_id: template.contentId,
			pe_id: ENTITY_ID,
			message: message
		});

		// Very important for Indian SMS providers: URLSearchParams encodes spaces as '+'.
		// Some providers (like VISPL) pass the literal '+' to the DLT scrubber, causing a template mismatch.
		// We must manually replace '+' with '%20' so spaces are correctly parsed.
		const queryString = params.toString().replace(/\+/g, '%20');
		const requestUrl = `${VISPL_API_URL}?${queryString}`;

		// Logging the exact output for DLT scrubber debugging
		console.log('--- SMS DLT DEBUG LOG ---');
		console.log('Template Type:', templateType);
		console.log('Phone Number:', phoneNumber);
		console.log('Sanitized Vars:', sanitizedVars);
		console.log('EXACT MESSAGE TEXT (Sent to VISPL):', message);
		console.log('EXACT MESSAGE LENGTH:', message.length);
		console.log('REQUEST URL:', requestUrl);
		console.log('---------------------------');

		const response = await fetch(requestUrl);
		const resultText = await response.text();

		// Check if HTTP is 200 OK and result text doesn't indicate a provider error
		const isProviderError = resultText.toLowerCase().includes('error') || resultText.toLowerCase().includes('fail');

		if (response.ok && !isProviderError) {
			return json({ success: true, providerResponse: resultText, message });
		} else {
			return json({ error: 'Failed to send SMS via provider', details: resultText }, { status: response.ok ? 400 : response.status });
		}
	} catch (error: any) {
		console.error('SMS API Error:', error);
		return json({ error: 'Internal server error', details: error.message }, { status: 500 });
	}
};
