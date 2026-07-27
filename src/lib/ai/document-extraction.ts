import { z } from 'zod';
import JSZip from 'jszip';
import { createTokenRouterChatCompletion, isTokenRouterConfigured } from '@/lib/ai/tokenrouter';
import { ensurePdfNodePolyfills } from '@/lib/pdf-node-polyfills';

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

export type DocumentTextExtractionResult = {
  text: string;
  method: 'pdf-text' | 'pdf-ocr' | 'image-ocr' | 'docx' | 'xlsx' | 'text' | 'unsupported' | 'failed';
  failureReason: string | null;
  ocrAttempted: boolean;
};

function truncateText(value: string, length: number) {
  return value.length > length ? `${value.slice(0, length)}...` : value;
}

function normalizeExtractedText(value: string) {
  return truncateText(value.replace(/\s+/g, ' ').trim(), 12000);
}

function decodeXmlEntities(value: string) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

async function extractDocxText(buffer: Buffer) {
  const zip = await JSZip.loadAsync(buffer);
  const xml = await zip.file('word/document.xml')?.async('string');
  if (!xml) return '';

  return normalizeExtractedText(
    [...xml.matchAll(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g)]
      .map((match) => decodeXmlEntities(match[1]))
      .join(' '),
  );
}

async function extractXlsxText(buffer: Buffer) {
  const zip = await JSZip.loadAsync(buffer);
  const sharedXml = await zip.file('xl/sharedStrings.xml')?.async('string');
  const sharedStrings = sharedXml
    ? [...sharedXml.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((match) => decodeXmlEntities(match[1]))
    : [];
  const rows: string[] = [];

  for (const name of Object.keys(zip.files).filter((fileName) => /^xl\/worksheets\/sheet\d+\.xml$/.test(fileName)).sort()) {
    const xml = await zip.file(name)?.async('string');
    if (!xml) continue;

    for (const rowMatch of xml.matchAll(/<row[\s\S]*?<\/row>/g)) {
      const cells: string[] = [];
      for (const cellMatch of rowMatch[0].matchAll(/<c[^>]*?(?:t="([^"]+)")?[^>]*>([\s\S]*?)<\/c>/g)) {
        const cellType = cellMatch[1];
        const body = cellMatch[2];
        const value = body.match(/<v>([\s\S]*?)<\/v>/)?.[1] ?? body.match(/<t[^>]*>([\s\S]*?)<\/t>/)?.[1] ?? '';
        const decoded = decodeXmlEntities(value);
        cells.push(cellType === 's' ? sharedStrings[Number(decoded)] || '' : decoded);
      }
      if (cells.some(Boolean)) rows.push(cells.join(' '));
    }
  }

  return normalizeExtractedText(rows.join('\n'));
}

async function ocrImageDataUrl(dataUrl: string) {
  if (!(await isTokenRouterConfigured())) {
    return '';
  }

  const completion = await createTokenRouterChatCompletion(
    [
      {
        role: 'system',
        content: 'You are an OCR engine for shipping documents. Return only the readable text you can see.',
      },
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Extract all readable document text from this image.' },
          { type: 'image_url', image_url: { url: dataUrl } },
        ],
      },
    ],
    { maxTokens: 1200, temperature: 0 },
  );

  return normalizeExtractedText(completion.content);
}

async function renderPdfPageImages(buffer: Buffer, maxPages = 2) {
  await ensurePdfNodePolyfills();
  const [pdfjs, canvas] = await Promise.all([
    import('pdfjs-dist/legacy/build/pdf.mjs'),
    import('@napi-rs/canvas'),
  ]);
  const document = await pdfjs.getDocument({
    data: new Uint8Array(buffer),
    disableWorker: true,
    isEvalSupported: false,
  } as unknown as Parameters<typeof pdfjs.getDocument>[0]).promise;
  const images: string[] = [];

  try {
    const pageCount = Math.min(document.numPages, maxPages);
    for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 1.4 });
      const renderedCanvas = canvas.createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
      const context = renderedCanvas.getContext('2d');
      await page.render({
        canvas: renderedCanvas as unknown as HTMLCanvasElement,
        canvasContext: context as unknown as CanvasRenderingContext2D,
        viewport,
      }).promise;
      images.push(renderedCanvas.toDataURL('image/png'));
    }
  } finally {
    await document.destroy();
  }

  return images;
}

async function ocrPdfImages(buffer: Buffer) {
  if (!(await isTokenRouterConfigured())) {
    return '';
  }

  const pageImages = await renderPdfPageImages(buffer);
  const pageTexts: string[] = [];
  for (const image of pageImages) {
    const text = await ocrImageDataUrl(image).catch(() => '');
    if (text) pageTexts.push(text);
  }

  return normalizeExtractedText(pageTexts.join('\n'));
}

export async function extractDocumentText(fileUrl: string, fileType: string) {
  const response = await fetch(fileUrl, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error('Failed to fetch uploaded file for extraction.');
  }

  if (fileType.includes('pdf')) {
    await ensurePdfNodePolyfills();
    const { PDFParse } = await import('pdf-parse');
    const buffer = Buffer.from(await response.arrayBuffer());
    const parser = new PDFParse({ data: buffer });

    try {
      const parsed = await parser.getText();
      const extractedText = normalizeExtractedText(parsed.text);
      if (extractedText.length > 20) {
        return extractedText;
      }

      return await ocrPdfImages(buffer).catch(() => '');
    } finally {
      await parser.destroy();
    }
  }

  if (fileType.includes('image/')) {
    const buffer = Buffer.from(await response.arrayBuffer());
    return await ocrImageDataUrl(`data:${fileType};base64,${buffer.toString('base64')}`).catch(() => '');
  }

  if (fileType.includes('wordprocessingml.document') || fileType.includes('application/msword')) {
    return extractDocxText(Buffer.from(await response.arrayBuffer()));
  }

  if (fileType.includes('spreadsheetml.sheet') || fileType.includes('application/vnd.ms-excel')) {
    return extractXlsxText(Buffer.from(await response.arrayBuffer()));
  }

  if (fileType.includes('csv') || fileType.includes('text')) {
    const text = await response.text();
    return normalizeExtractedText(text);
  }

  return '';
}

export async function extractDocumentTextWithMetadata(fileUrl: string, fileType: string): Promise<DocumentTextExtractionResult> {
  try {
    const response = await fetch(fileUrl, { cache: 'no-store' });
    if (!response.ok) {
      return {
        text: '',
        method: 'failed',
        failureReason: 'Failed to fetch uploaded file for extraction.',
        ocrAttempted: false,
      };
    }

    if (fileType.includes('pdf')) {
      await ensurePdfNodePolyfills();
      const { PDFParse } = await import('pdf-parse');
      const buffer = Buffer.from(await response.arrayBuffer());
      const parser = new PDFParse({ data: buffer });

      try {
        const parsed = await parser.getText();
        const extractedText = normalizeExtractedText(parsed.text);
        if (extractedText.length > 20) {
          return {
            text: extractedText,
            method: 'pdf-text',
            failureReason: null,
            ocrAttempted: false,
          };
        }

        const ocrText = await ocrPdfImages(buffer).catch(() => '');
        return {
          text: ocrText,
          method: ocrText ? 'pdf-ocr' : 'failed',
          failureReason: ocrText
            ? null
            : await isTokenRouterConfigured()
              ? 'No embedded PDF text was found and OCR did not return readable text.'
              : 'No embedded PDF text was found. Configure TokenRouter to enable OCR fallback.',
          ocrAttempted: true,
        };
      } finally {
        await parser.destroy();
      }
    }

    if (fileType.includes('image/')) {
      const buffer = Buffer.from(await response.arrayBuffer());
      const text = await ocrImageDataUrl(`data:${fileType};base64,${buffer.toString('base64')}`).catch(() => '');
      return {
        text,
        method: text ? 'image-ocr' : 'failed',
        failureReason: text
          ? null
          : await isTokenRouterConfigured()
            ? 'Image OCR did not return readable text.'
            : 'Configure TokenRouter to enable image OCR.',
        ocrAttempted: true,
      };
    }

    if (fileType.includes('wordprocessingml.document') || fileType.includes('application/msword')) {
      const text = await extractDocxText(Buffer.from(await response.arrayBuffer()));
      return {
        text,
        method: 'docx',
        failureReason: text ? null : 'No readable DOCX text was found.',
        ocrAttempted: false,
      };
    }

    if (fileType.includes('spreadsheetml.sheet') || fileType.includes('application/vnd.ms-excel')) {
      const text = await extractXlsxText(Buffer.from(await response.arrayBuffer()));
      return {
        text,
        method: 'xlsx',
        failureReason: text ? null : 'No readable spreadsheet text was found.',
        ocrAttempted: false,
      };
    }

    if (fileType.includes('csv') || fileType.includes('text')) {
      const text = normalizeExtractedText(await response.text());
      return {
        text,
        method: 'text',
        failureReason: text ? null : 'No readable text was found.',
        ocrAttempted: false,
      };
    }

    return {
      text: '',
      method: 'unsupported',
      failureReason: 'This file type is not supported for text extraction.',
      ocrAttempted: false,
    };
  } catch (error) {
    return {
      text: '',
      method: 'failed',
      failureReason: error instanceof Error ? error.message : 'Document text extraction failed.',
      ocrAttempted: false,
    };
  }
}

export function buildDocumentReviewPrompt(input: z.infer<typeof documentExtractionRequestSchema>, extractedText: string) {
  return `You are extracting metadata for an internal shipping document review workflow.
Return valid JSON only with keys suggestedName, suggestedCategory, description, tags, summary, extractedTextPreview.
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
Return valid JSON only with keys invoiceNumber, amount, currency, vendor, date, dueDate, notes, confidenceNotes, extractedTextPreview.
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
