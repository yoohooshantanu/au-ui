import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export interface InvoiceData {
	transactionId: string;
	subscriberName: string;
	amount: string;
	productInfo: string;
	date: string;
}

export async function generateInvoicePDF(data: InvoiceData): Promise<Buffer> {
	// Create a new PDFDocument
	const pdfDoc = await PDFDocument.create();
	
	// Add a blank page
	const page = pdfDoc.addPage([600, 800]);
	
	// Get standard fonts
	const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
	const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
	
	const { width, height } = page.getSize();
	
	// Helper function for text
	const drawText = (text: string, x: number, y: number, font: any, size: number, color = rgb(0, 0, 0)) => {
		page.drawText(text, { x, y, font, size, color });
	};

	// 1. Header
	drawText('PAYMENT RECEIPT / INVOICE', 50, height - 80, helveticaBold, 24, rgb(0.1, 0.1, 0.4));
	
	// 2. Company / Date info
	drawText('Date: ' + data.date, 50, height - 120, helveticaFont, 12);
	drawText('Transaction ID: ' + data.transactionId, 50, height - 140, helveticaFont, 12);

	// 3. Divider
	page.drawLine({
		start: { x: 50, y: height - 160 },
		end: { x: width - 50, y: height - 160 },
		thickness: 1,
		color: rgb(0.8, 0.8, 0.8),
	});

	// 4. Billed To
	drawText('Billed To:', 50, height - 190, helveticaBold, 14);
	drawText(data.subscriberName, 50, height - 210, helveticaFont, 12, rgb(0.2, 0.2, 0.2));

	// 5. Table Header
	page.drawRectangle({
		x: 50,
		y: height - 270,
		width: width - 100,
		height: 30,
		color: rgb(0.95, 0.95, 0.95),
	});
	drawText('Description', 60, height - 260, helveticaBold, 12);
	drawText('Amount (INR)', width - 160, height - 260, helveticaBold, 12);

	// 6. Table Row (Item)
	drawText(data.productInfo, 60, height - 300, helveticaFont, 12);
	drawText('Rs. ' + data.amount, width - 160, height - 300, helveticaFont, 12);

	// 7. Divider before Total
	page.drawLine({
		start: { x: 50, y: height - 330 },
		end: { x: width - 50, y: height - 330 },
		thickness: 1,
		color: rgb(0.8, 0.8, 0.8),
	});

	// 8. Total
	drawText('Total Paid:', width - 250, height - 360, helveticaBold, 14);
	drawText('Rs. ' + data.amount, width - 160, height - 360, helveticaBold, 14, rgb(0, 0.5, 0));

	// 9. Footer
	drawText('Thank you for your payment!', 50, 100, helveticaFont, 12, rgb(0.4, 0.4, 0.4));
	page.drawLine({
		start: { x: 50, y: 80 },
		end: { x: width - 50, y: 80 },
		thickness: 1,
		color: rgb(0.8, 0.8, 0.8),
	});

	// Save and return as Buffer
	const pdfBytes = await pdfDoc.save();
	return Buffer.from(pdfBytes);
}
