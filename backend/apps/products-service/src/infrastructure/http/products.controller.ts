import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  CurrentUser,
  InternalKeyGuard,
  Permission,
  RequirePermissions,
  type JwtPayload,
} from '@nexostock/common';
import { CategoriesService } from '../../application/categories.service';
import { ProductsService } from '../../application/products.service';
import {
  CreateCategoryDto,
  CreateProductDto,
  ListProductsQueryDto,
  QuoteProductsDto,
  UpdateCategoryDto,
  UpdateProductDto,
} from './dto/product.dto';

function bearerToken(authorization?: string): string {
  if (!authorization?.startsWith('Bearer ')) {
    throw new UnauthorizedException({
      message: 'Token inválido',
      code: 'UNAUTHENTICATED',
    });
  }
  return authorization.slice('Bearer '.length);
}

@ApiTags('categories')
@ApiBearerAuth()
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @RequirePermissions(Permission.PRODUCTS_VIEW, Permission.SALES_VIEW)
  list(@CurrentUser() actor: JwtPayload) {
    return this.categoriesService.list(actor.businessId);
  }

  @Post()
  @RequirePermissions(Permission.PRODUCTS_MANAGE)
  create(@CurrentUser() actor: JwtPayload, @Body() dto: CreateCategoryDto) {
    return this.categoriesService.create(actor, dto);
  }

  @Patch(':id')
  @RequirePermissions(Permission.PRODUCTS_MANAGE)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: JwtPayload,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.categoriesService.update(id, actor, dto);
  }
}

@ApiTags('products')
@ApiBearerAuth()
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @RequirePermissions(Permission.PRODUCTS_VIEW, Permission.SALES_VIEW)
  list(@CurrentUser() actor: JwtPayload, @Query() query: ListProductsQueryDto) {
    return this.productsService.list(actor.businessId, query);
  }

  @Get(':id')
  @RequirePermissions(Permission.PRODUCTS_VIEW, Permission.SALES_VIEW)
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: JwtPayload) {
    return this.productsService.findOne(id, actor.businessId);
  }

  @Post()
  @RequirePermissions(Permission.PRODUCTS_MANAGE)
  create(
    @CurrentUser() actor: JwtPayload,
    @Body() dto: CreateProductDto,
    @Headers('authorization') authorization: string,
  ) {
    return this.productsService.create(actor, dto, bearerToken(authorization));
  }

  @Patch(':id')
  @RequirePermissions(Permission.PRODUCTS_MANAGE)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: JwtPayload,
    @Body() dto: UpdateProductDto,
    @Headers('authorization') authorization: string,
  ) {
    return this.productsService.update(id, actor, dto, bearerToken(authorization));
  }
}

@ApiTags('internal-products')
@ApiBearerAuth()
@UseGuards(InternalKeyGuard)
@Controller('internal/products')
export class ProductsInternalController {
  constructor(private readonly productsService: ProductsService) {}

  @Post('quote')
  @RequirePermissions(
    Permission.SALES_MANAGE,
    Permission.PRODUCTS_VIEW,
    Permission.INVENTORY_MANAGE,
    Permission.REPORTS_VIEW,
  )
  quote(@CurrentUser() actor: JwtPayload, @Body() dto: QuoteProductsDto) {
    return this.productsService.quote(actor.businessId, dto);
  }

  @Get('summary')
  @RequirePermissions(Permission.REPORTS_VIEW, Permission.PRODUCTS_VIEW)
  summary(@CurrentUser() actor: JwtPayload) {
    return this.productsService.summary(actor.businessId);
  }
}
