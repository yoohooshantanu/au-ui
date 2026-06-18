import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { SMS_API_USERNAME, SMS_API_PASSWORD } from '$env/static/private';

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

		const message = template.formatMessage(variables);
		
		const params = new URLSearchParams({
			username: SMS_API_USERNAME,
			password: SMS_API_PASSWORD,
			messageType: 'text',
			mobile: phoneNumber,
			senderId: SENDER_ID,
			ContentID: template.contentId,
			EntityID: ENTITY_ID,
			message: message
		});

		const requestUrl = `${VISPL_API_URL}?${params.toString()}`;

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
