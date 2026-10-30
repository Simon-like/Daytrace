import { resolve } from "node:path";
import { ContentSnapshotInvalidError } from "../common/api-error";
import { loadContentSnapshot } from "../modules/content/content.snapshot";

async function main(): Promise<void> {
  const root = resolve(process.cwd(), process.env.CONTENT_ROOT ?? "apps/api/fixtures/content");
  try {
    const snapshot = await loadContentSnapshot(root);
    console.log(JSON.stringify({
      valid: true,
      recordCount: snapshot.records.length,
      publicRecordCount: snapshot.publicRecords.length,
      contentRevision: snapshot.contentRevision,
    }, null, 2));
  } catch (error: unknown) {
    if (error instanceof ContentSnapshotInvalidError) {
      console.error(JSON.stringify({ valid: false, errors: error.details }, null, 2));
      process.exitCode = 1;
      return;
    }
    throw error;
  }
}

void main();
