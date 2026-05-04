import pdfParse from 'pdf-parse';
import { z } from 'zod';

export const documentExtractionRequestSchema = z.object({
  mode: z.enum(['document-review', 'invoice-draft']),
  fileUrl: z.string().url(),
  fileName: z.string().min(1),
  fileType: z.string().min(1),
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  categoryHint: z.string().optional(),
});

export const documentReviewResponseSchema = z.object({
  suggestedName: z.string(),
  suggestedCategory: z.string(),
  description: z.string(),
  tags: z.array(z.string()).max(8),
  summary: z.string(),
  extractedTextPreview: z.string(),
});

export const invoiceDraftResponseSchema = z.object({
  invoiceNumber: z.string().optional(),
  amount: z.number().nullable(),
  currency: z.string().optional(),
  vendor: z.string().optional(),
  date: z.string().optional(),
  dueDate: z.string().optional(),
  notes: z.string().optional(),
  confidenceNotes: z.string(),
  extractedTextPreview: z.string(),
});

function truncateText(value: string, length: number) {
  return value.length > length ? `${value.slice(0, length)}...` : value;
}

export async function extractDocumentText(fileUrl: string, fileType: string) {
  const response = await fetch(fileUrl, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error('Failed to fetch uploaded file for extraction.');
  }

  if (fileType.includes('pdf')) {
    const buffer = Buffer.from(await response.arrayBuffer());
    const parsed = await pdfParse(buffer);
    return truncateText(parsed.text.replace(/\s+/g, ' ').trim(), 12000);
  }

  if (fileType.includes('csv') || fileType.includes('text')) {
    const text = await response.text();
    return truncateText(text.replace(/\s+/g, ' ').trim(), 12000);
  }

  return '';
}

export function buildDocumentReviewPrompt(input: z.infer<typeof documentExtractionRequestSchema>, extractedText: string) {
  return `You are extracting metadata for an internal shipping document review workflow.
Return valid JSON only with keys suggestedName, suggestedCategory, description, tags, summary.
Do not include markdown.
Use one of these categories when possible: INVOICE, BILL_OF_LADING, CUSTOMS, INSURANCE, TITLE, INSPECTION_REPORT, EXPORT_DOCUMENT, PACKING_LIST, CONTRACT, PHOTO, OTHER.

File name: ${input.fileName}
File type: ${input.fileType}
Category hint: ${input.categoryHint || 'None'}
Extracted text:
${extractedText || 'No text could be extracted from the file.'}`;
}

export function buildInvoiceExtractionPrompt(input: z.infer<typeof documentExtractionRequestSchema>, extractedText: string) {
  return `You are extracting invoice fields for a review-before-save workflow.
Return valid JSON only with keys invoiceNumber, amount, currency, vendor, date, dueDate, notes, confidenceNotes.
Use ISO date format YYYY-MM-DD when dates are present.
Set unknown scalar values to empty string and amount to null.
Do not include markdown.

File name: ${input.fileName}
File type: ${input.fileType}
Extracted text:
${extractedText || 'No text could be extracted from the file.'}`;
}

export function buildFallbackDocumentReview(input: z.infer<typeof documentExtractionRequestSchema>, extractedText: string) {
  const normalizedName = input.fileName.replace(/\.[^.]+$/, '');
  const lowerText = extractedText.toLowerCase();
  const lowerName = normalizedName.toLowerCase();
  const category = input.categoryHint
    || (lowerText.includes('invoice') || lowerName.includes('invoice') ? 'INVOICE'
      : lowerText.includes('bill of lading') ? 'BILL_OF_LADING'
      : lowerText.includes('insurance') ? 'INSURANCE'
      : lowerText.includes('title') ? 'TITLE'
      : 'OTHER');

  const tags = [category.toLowerCase(), lowerName.split(/[-_\s]+/)[0]]
    .filter(Boolean)
    .slice(0, 5);

  return {
    suggestedName: normalizedName,
    suggestedCategory: category,
    description: extractedText ? truncateText(extractedText, 180) : `Uploaded ${category.toLowerCase().replace(/_/g, ' ')} document.`,
    tags,
    summary: extractedText ? truncateText(extractedText, 220) : 'No text could be extracted automatically from this file.',
    extractedTextPreview: truncateText(extractedText || 'No extracted text available.', 500),
  };
}

export function buildFallbackInvoiceExtraction(input: z.infer<typeof documentExtractionRequestSchema>, extractedText: string) {
  const invoiceNumberMatch = extractedText.match(/invoice\s*(?:number|no\.?|#)?\s*[:#-]?\s*([A-Z0-9\-\/]+)/i)
    || input.fileName.match(/([A-Z]{2,}[-_]?\d{2,}|INV[-_]?\d+)/i);
  const amountMatch = extractedText.match(/(?:total|amount due|invoice total)\s*[:$]?\s*([0-9,]+(?:\.[0-9]{2})?)/i);
  const dueDateMatch = extractedText.match(/due date\s*[:\-]?\s*(\d{4}-\d{2}-\d{2}|\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i);
  const issueDateMatch = extractedText.match(/(?:invoice date|date)\s*[:\-]?\s*(\d{4}-\d{2}-\d{2}|\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i);

  return {
    invoiceNumber: invoiceNumberMatch?.[1] || '',
    amount: amountMatch?.[1] ? Number(amountMatch[1].replace(/,/g, '')) : null,
    currency: extractedText.includes('USD') || extractedText.includes('$') ? 'USD' : '',
    vendor: '',
    date: issueDateMatch?.[1] || '',
    dueDate: dueDateMatch?.[1] || '',
    notes: extractedText ? truncateText(extractedText, 180) : `Imported from ${input.fileName}`,
    confidenceNotes: extractedText ? 'Fallback extraction was used. Please verify all invoice fields before saving.' : 'No text could be extracted automatically from this file.',
    extractedTextPreview: truncateText(extractedText || 'No extracted text available.', 500),
  };
}