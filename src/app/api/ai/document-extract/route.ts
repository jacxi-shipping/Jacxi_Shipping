import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createTokenRouterChatCompletion, isTokenRouterConfigured } from '@/lib/ai/tokenrouter';
import { createAiInteractionLog } from '@/lib/ai/audit';
import { extractJsonObject } from '@/lib/ai/json';
import {
  buildDocumentReviewPrompt,
  buildFallbackDocumentReview,
  buildFallbackInvoiceExtraction,
  buildInvoiceExtractionPrompt,
  documentExtractionRequestSchema,
  documentReviewResponseSchema,
  extractDocumentText,
  invoiceDraftResponseSchema,
} from '@/lib/ai/document-extraction';
import { z } from 'zod';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const parsed = documentExtractionRequestSchema.parse(await request.json());
    const extractedText = await extractDocumentText(parsed.fileUrl, parsed.fileType).catch(() => '');

    let result:
      | z.infer<typeof invoiceDraftResponseSchema>
      | z.infer<typeof documentReviewResponseSchema>;
    let model = parsed.mode === 'invoice-draft' ? 'deterministic-invoice-extraction' : 'deterministic-document-review';
    let source: 'tokenrouter-ai' | 'rules' = 'rules';
    let prompt = parsed.mode === 'invoice-draft'
      ? buildInvoiceExtractionPrompt(parsed, extractedText)
      : buildDocumentReviewPrompt(parsed, extractedText);

    result = parsed.mode === 'invoice-draft'
      ? buildFallbackInvoiceExtraction(parsed, extractedText)
      : buildFallbackDocumentReview(parsed, extractedText);

    if (isTokenRouterConfigured() && extractedText) {
      try {
        const completion = await createTokenRouterChatCompletion(
          [
            {
              role: 'system',
              content: parsed.mode === 'invoice-draft'
                ? 'You extract invoice fields from shipping documents. Return valid JSON only.'
                : 'You extract document metadata for shipping operations. Return valid JSON only.',
            },
            { role: 'user', content: prompt },
          ],
          { maxTokens: 450, temperature: 0.1 },
        );

        result = parsed.mode === 'invoice-draft'
          ? invoiceDraftResponseSchema.parse(extractJsonObject(completion.content))
          : documentReviewResponseSchema.parse(extractJsonObject(completion.content));
        model = completion.model;
        source = 'tokenrouter-ai';
      } catch {
        // Fallback already set.
      }
    }

    const aiLog = await createAiInteractionLog({
      feature: parsed.mode === 'invoice-draft' ? 'invoice-extraction-review' : 'document-extraction-review',
      entityType: parsed.entityType ?? null,
      entityId: parsed.entityId ?? null,
      actorUserId: session.user.id,
      provider: source === 'tokenrouter-ai' ? 'tokenrouter-ai' : 'rules',
      model,
      prompt,
      response: JSON.stringify(result),
      requestPayload: {
        mode: parsed.mode,
        fileName: parsed.fileName,
        fileType: parsed.fileType,
        entityType: parsed.entityType,
        entityId: parsed.entityId,
      },
      responsePayload: result,
      status: source === 'tokenrouter-ai' ? 'SUCCESS' : 'FALLBACK',
    });

    return NextResponse.json({
      ...result,
      aiInteractionLogId: aiLog.id,
      source,
      model,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid document extraction request.', details: error.issues }, { status: 400 });
    }

    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to extract document data.' }, { status: 500 });
  }
}
