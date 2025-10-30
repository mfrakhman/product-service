import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { RabbitmqService } from '../rabbitmq/rabbitmq.service';
import { ProductsRepository } from './products.repository';
import { Product } from './products.entity';
import { ProductCacheService } from './product-cache.service';

@Injectable()
export class ProductsService {
  constructor(
    private readonly productRepository: ProductsRepository,
    private readonly cache: ProductCacheService,
    private readonly rabbitmqService: RabbitmqService,
  ) {}

  async createProduct(dto: CreateProductDto): Promise<Product> {
    const product = await this.productRepository.createProduct(dto);
    await this.cache.setCachedProduct(product.id, product);
    await this.rabbitmqService.publish(
      'product.exchange',
      'product.created',
      product,
    );
    return product;
  }

  async getProducts(): Promise<Product[]> {
    return this.productRepository.findAll();
  }

  async getProductById(id: string): Promise<Product> {
    const cacheProduct = await this.cache.getCachedProduct(id);
    if (cacheProduct) {
      return cacheProduct;
    }

    const product = await this.productRepository.findById(id);
    if (!product) {
      throw new NotFoundException(`Product not found with id ${id}`);
    }
    await this.cache.setCachedProduct(product.id, product);
    return product;
  }

  async decreaseQuantity(
    productId: string,
    quantity: number,
  ): Promise<Product | null> {
    let product = await this.cache.getCachedProduct(productId);
    if (!product) {
      product = await this.productRepository.findById(productId);
      if (!product) {
        throw new NotFoundException(`Product not found with id ${productId}`);
      }
      await this.cache.setCachedProduct(productId, product);
    }
    if (product.quantity < quantity) {
      throw new BadRequestException(
        `Not Enough Stock in Product with Id ${productId}`,
      );
    }
    const updatedProduct = await this.productRepository.updateQuantity(
      productId,
      product.qty - quantity,
    );

    await this.cache.setCachedProduct(productId, updatedProduct);
    return updatedProduct;
  }
}
