import { Module, type DynamicModule } from "@nestjs/common";
import { ContentModule } from "./modules/content/content.module";

@Module({})
export class AppModule {
  static register(contentRoot: string): DynamicModule {
    return {
      module: AppModule,
      imports: [ContentModule.register(contentRoot)],
    };
  }
}
