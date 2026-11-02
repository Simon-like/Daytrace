import { type DynamicModule, Module } from "@nestjs/common";
import { ASSET_CATALOG, type AssetCatalog } from "./asset-catalog";
import { AssetsController } from "./assets.controller";
import { AssetsService } from "./assets.service";

@Module({})
export class AssetsModule {
  static register(catalog: AssetCatalog): DynamicModule {
    return {
      module: AssetsModule,
      controllers: [AssetsController],
      providers: [{ provide: ASSET_CATALOG, useValue: catalog }, AssetsService],
      exports: [AssetsService],
    };
  }
}
