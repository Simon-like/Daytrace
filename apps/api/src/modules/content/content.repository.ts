import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const SNAPSHOT_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
export function stateRoot(root: string): string { return join(root, ".daytrace"); }
export async function activeContentRoot(root: string): Promise<string> {
  let value: string;
  try { value = await readFile(join(stateRoot(root), "current.json"), "utf8"); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return root; throw error; }
  const pointer = JSON.parse(value) as { snapshot?: string };
  if (!pointer.snapshot || !SNAPSHOT_ID.test(pointer.snapshot)) throw new Error("Invalid content pointer");
  return join(stateRoot(root), "snapshots", pointer.snapshot);
}
