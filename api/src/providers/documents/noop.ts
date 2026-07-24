import type {
  DocumentExtractionProvider,
  DocumentExtractionInput,
  DocumentExtractionResult,
} from './types.js';

/**
 * No-op document extraction provider — used when extraction is not configured.
 * Returns an empty result indicating no extraction was performed.
 */
export class NoOpDocumentExtraction implements DocumentExtractionProvider {
  readonly name = 'none';
  readonly available = false;

  async extract(input: DocumentExtractionInput): Promise<DocumentExtractionResult> {
    return {
      provider: 'none',
      documentType: input.documentType,
      fields: [],
      lineItems: [],
      overallConfidence: 0,
      warnings: ['Document extraction is not configured (DOCUMENT_EXTRACTION_PROVIDER=none).'],
    };
  }
}
