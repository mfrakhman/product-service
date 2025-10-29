import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import { RabbitmqService } from '../rabbitmq/rabbitmq.service';
import { ProductsRepository } from './products.repository';
import { Product } from './products.entity';
import { log } from 'console';
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
    await this.rabbitmqService.publish('product.exchange', 'product.created', {
      product,
    });
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
// constructor(
//   private readonly productsRepository: ProductsRepository,
//   @Inject(CACHE_MANAGER)
//   private cacheManager: Cache,
//   private rabbitmqService: RabbitmqService,
// ) {}
// async create(data: CreateProductDto): Promise<Product> {
//   try {
//     const saved = await this.productsRepository.createProduct(data);
//     await this.cacheManager.del(`product:${saved.id}`);
//     await this.rabbitmqService.publish('product_created', saved);
//     return saved;
//   } catch (error) {
//     log('Error creating product:', error);
//     throw new InternalServerErrorException('Failed to create product');
//   }
// }
// async findAll(): Promise<Product[]> {
//   const products = this.productsRepository.findAll();
//   if (!products) {
//     throw new NotFoundException('No products found');
//   }
//   return products;
// }
// async findOne(id: number): Promise<Product> {
//   const cachedKey = `product:${id}`;
//   const cached = await this.cacheManager.get<Product>(cachedKey);
//   if (cached) {
//     console.log('Retrieved from cache');
//     return cached;
//   }
//   const product = await this.productsRepository.findById(id);
//   if (!product) {
//     throw new NotFoundException(`product with ID ${id} not found`);
//   }
//   await this.cacheManager.set(cachedKey, product, 60_000);
//   console.log('Retrieved from DB and cached');
//   return product;
// }
// async handleOrderCreatedEvent(payload: {
//   productId: number;
//   quantity: number;
// }) {
//   const { productId, quantity } = payload;
//   const product = await this.productsRepository.findById(productId);
//   if (!product) {
//     await this.rabbitmqService.publish('stock_insufficient', {
//       productId,
//       requestedQuantity: quantity,
//       reason: 'Product not found',
//     });
//     console.warn(`Product with ID ${productId} not found for order event`);
//     return;
//   }
//   if (product.qty < quantity) {
//     await this.rabbitmqService.publish('stock_insufficient', {
//       productId,
//       requestedQuantity: quantity,
//       availableQuantity: product.qty,
//       productName: product.name,
//       reason: 'Insufficient stock',
//     });
//     console.warn(`Insufficient product quantity on product ${productId}`);
//     return;
//   }
//   const newQty = product.qty - quantity;
//   await this.productsRepository.updateQuantity(productId, newQty);
//   await this.cacheManager.del(`product:${productId}`);
//   await this.rabbitmqService.publish('stock_updated', {
//     productId,
//     newQuantity: newQty,
//   });
//   console.log(`Reduced quantity for product ${productId} by ${quantity}`);
// }
// }
