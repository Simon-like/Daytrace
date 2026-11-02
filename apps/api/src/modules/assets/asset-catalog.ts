export const ASSET_CATALOG = "ACCESS_ASSET_CATALOG";

export interface AssetDescriptor {
  readonly id: string;
  readonly visibility: "public" | "private";
  readonly rootPath: string;
  readonly relativePath: string;
  readonly mediaType: "image/png" | "image/jpeg" | "image/webp" | "image/gif" | "application/pdf" | "text/plain";
}

export interface AssetCatalog {
  findPublishedAsset(assetId: string): Promise<AssetDescriptor | null> | AssetDescriptor | null;
}
