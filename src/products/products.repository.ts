import {
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './products.entity';

@Injectable()
export class ProductsRepository {
  constructor(
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
  ) {}

  async createProduct(product: Partial<Product>): Promise<Product> {
    const newProduct = this.productRepo.create(product);
    return this.productRepo.save(newProduct);
  }

  async findById(id: number): Promise<Product | null> {
    return this.productRepo.findOneBy({ id });
  }

  async findAll(): Promise<Product[]> {
    return this.productRepo.find();
  }

  async updateQuantity(productId: number, qty: number): Promise<Product | null> {
    await this.productRepo.update(productId, { qty });
    return this.findById(productId);
  }

    
    // const product = await this.findById(productId);
    // if (!product) {
    //   throw new NotFoundException(`Product with ID ${productId} not found`);
    // }
    // const newQty = product.qty - quantity;
    // if (newQty < 0) {
    //   throw new BadRequestException('Insufficient product quantity');
    // }

    // await this.productRepo.update(productId, { qty: newQty });
    // return this.findById(productId);
}
