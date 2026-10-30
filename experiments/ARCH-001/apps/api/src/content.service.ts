import { Injectable } from "@nestjs/common";
import { access, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { CONTRACT_VERSION, parsePublicArticle, type PublicArticle } from "@daytrace/arch-contracts";
import { RecordNotFoundError } from "./errors";
import { renderRecord } from "./markdown";

@Injectable()
export class ContentService {
  constructor(private readonly contentRoot: string) {}

  async ready(): Promise<void> {
    await access(resolve(this.contentRoot, "public"));
  }

  async getPublicRecord(slug: string): Promise<PublicArticle> {
    if (!/^[a-z0-9][a-z0-9-]*$/.test(slug)) throw new RecordNotFoundError();

    const publicRoot = resolve(this.contentRoot, "public");
    const filePath = resolve(publicRoot, `${slug}.md`);
    if (dirname(filePath) !== publicRoot) throw new RecordNotFoundError();

    let source: string;
    try {
      source = await readFile(filePath, "utf8");
    } catch (error: unknown) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") throw new RecordNotFoundError();
      throw error;
    }

    const record = renderRecord(source, `content/public/${slug}.md`);
    if (record.slug !== slug || record.visibility !== "public" || record.status !== "published") {
      throw new RecordNotFoundError();
    }

    return parsePublicArticle({
      contractVersion: CONTRACT_VERSION,
      id: record.id,
      slug: record.slug,
      title: record.title,
      date: record.date,
      summary: record.summary,
      html: record.html,
    });
  }
}
