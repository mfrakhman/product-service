import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  ValidationPipe,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  create(@Body(new ValidationPipe()) dto: CreateProductDto) {
    return this.productsService.create(dto);
  }

  @Get(':id')
  findOne(@Param('id') id: number) {
    return this.productsService.findOne(id);
  }

  @Get()
  findAll() {
    return this.productsService.findAll();
  }
}
