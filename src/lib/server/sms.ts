export async function sendInvoiceSMS(
	phone: string,
	subscriberName: string,
	amount: string,
	invoiceUrl: string
): Promise<void> {
    const message = `Dear ${subscriberName}, your payment of Rs.${amount} was successful. Download your receipt here: ${invoiceUrl}. Thank you!`;
    
    // TODO: Replace with the client's actual SMS Gateway integration when they provide it.
    // Example format usually looks like this:
    /*
    const apiKey = process.env.SMS_API_KEY;
    try {
        await fetch('https://api.smsgateway.com/send', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                to: phone,
                message: message
            })
        });
        console.log(`SMS Sent successfully to ${phone}!`);
    } catch(err) {
        console.error('Failed to send SMS', err);
    }
    */
   
    console.log(`[STUB] SMS integration pending. Would have sent: "${message}" to ${phone}`);
}
