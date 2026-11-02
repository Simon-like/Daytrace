import { constants } from "node:fs";
import { open, realpath } from "node:fs/promises";
import type { FileHandle } from "node:fs/promises";
import { isAbsolute, relative, resolve, sep } from "node:path";
import { Inject, Injectable } from "@nestjs/common";
import { isAssetId } from "@daytrace/contracts";
import { AssetNotFoundError, invalidAssetId } from "../../common/api-error";
import { ASSET_CATALOG, type AssetCatalog, type AssetDescriptor } from "./asset-catalog";

export interface OpenedAsset {
  readonly stream: ReturnType<FileHandle["createReadStream"]>;
  readonly size: number;
  readonly mediaType: AssetDescriptor["mediaType"];
  readonly visibility: AssetDescriptor["visibility"];
}

function outside(root: string, candidate: string): boolean {
  const path = relative(root, candidate);
  return path === "" || path === ".." || path.startsWith(`..${sep}`) || isAbsolute(path);
}

function validRelativePath(path: string): boolean {
  return path.length > 0 && !path.includes("\\") && !path.includes("\0") && !isAbsolute(path) &&
    path.split("/").every((segment) => segment !== "" && segment !== "." && segment !== "..");
}

@Injectable()
export class AssetsService {
  constructor(@Inject(ASSET_CATALOG) private readonly catalog: AssetCatalog) {}

  async open(assetId: string, ownerAuthenticated: boolean): Promise<OpenedAsset> {
    if (!isAssetId(assetId)) throw invalidAssetId();
    const descriptor = await this.catalog.findPublishedAsset(assetId);
    if (
      descriptor === null || descriptor.id !== assetId ||
      descriptor.visibility !== "public" && descriptor.visibility !== "private" ||
      descriptor.visibility === "private" && !ownerAuthenticated
    ) {
      throw new AssetNotFoundError();
    }
    if (
      !validRelativePath(descriptor.relativePath) ||
      !["image/png", "image/jpeg", "image/webp", "image/gif", "application/pdf", "text/plain"].includes(descriptor.mediaType)
    ) {
      throw new AssetNotFoundError();
    }

    let handle: FileHandle | undefined;
    try {
      const root = await realpath(descriptor.rootPath);
      const candidate = resolve(root, ...descriptor.relativePath.split("/"));
      if (outside(root, candidate)) throw new AssetNotFoundError();
      const actual = await realpath(candidate);
      if (outside(root, actual)) throw new AssetNotFoundError();
      handle = await open(actual, constants.O_RDONLY | constants.O_NOFOLLOW);
      const stats = await handle.stat();
      if (!stats.isFile()) throw new AssetNotFoundError();
      return {
        stream: handle.createReadStream({ autoClose: true }),
        size: stats.size,
        mediaType: descriptor.mediaType,
        visibility: descriptor.visibility,
      };
    } catch (error) {
      await handle?.close().catch(() => undefined);
      if (error instanceof AssetNotFoundError) throw error;
      throw new AssetNotFoundError();
    }
  }
}
