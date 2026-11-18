/**
 * Storage for professional verification documents (ID proof, certificates).
 *
 * Bytes never go in the database: only metadata (ProfessionalDocument.storageKey). A real implementation
 * should use a private bucket with server-side encryption and short-lived signed URLs, and restrict reads
 * to `professionals.verify`. Not configured in this milestone, so no upload/download endpoints exist yet.
 */
export abstract class DocumentStorage {
  abstract readonly configured: boolean;
  abstract put(key: string, body: Uint8Array, contentType: string): Promise<void>;
  /** Short-lived URL for viewing; never a public permanent link. */
  abstract signedUrl(key: string, expiresInSeconds: number): Promise<string>;
  abstract remove(key: string): Promise<void>;
}

export class UnconfiguredDocumentStorage extends DocumentStorage {
  readonly configured = false;
  private fail(): never {
    throw new Error("Document storage is not configured");
  }
  async put(): Promise<void> {
    this.fail();
  }
  async signedUrl(): Promise<string> {
    this.fail();
  }
  async remove(): Promise<void> {
    this.fail();
  }
}
