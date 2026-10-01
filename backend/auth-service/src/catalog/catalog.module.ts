import { Module } from '@nestjs/common';
import { CommonModule } from '../common/common.module';
import { CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';

@Module({
  imports: [CommonModule],
  controllers: [CatalogController],
  providers: [CatalogService],
})
export class CatalogModule {}
