/**
 * Contract for document extraction providers (Textract, Azure DI, etc.).
 * Canonical result shape shared across all implementations.
 */
export interface DocumentExtractionProvider {
  /**
   * Extract structured fields and line items from a document.
   * @param input - Document reference and metadata.
   * @returns Canonical extraction result.
   */
  extract(input: DocumentExtractionInput): Promise<DocumentExtractionResult>;

  /** Provider identifier for logging/diagnostics. */
  readonly name: string;

  /** Whether the provider is currently available/configured. */
  readonly available: boolean;
}

export interface DocumentExtractionInput {
  /** Storage key (S3 key or local path) of the document to process. */
  storageKey: string;
  /** MIME type (e.g. application/pdf, image/jpeg). */
  mimeType: string;
  /** User-selected document type/category. */
  documentType: string;
  /** Expected fields for this document type (for confidence scoring). */
  expectedFields?: string[];
}

export interface DocumentExtractionResult {
  /** Which provider produced this result. */
  provider: 'textract' | 'azure-di' | 'none';
  /** Document type/category. */
  documentType: string;
  /** Extracted key-value fields. */
  fields: DocumentField[];
  /** Extracted line items (for invoices/receipts). */
  lineItems: DocumentLineItem[];
  /** Overall confidence score (0-1). */
  overallConfidence: number;
  /** Reference to raw provider response (S3 key or blob ID). */
  rawReference?: string;
  /** Warnings or notes about the extraction. */
  warnings: string[];
}

export interface DocumentField {
  name: string;
  value: string;
  confidence: number;
}

export interface DocumentLineItem {
  description: string;
  quantity?: number;
  amount?: number;
  confidence: number;
}
