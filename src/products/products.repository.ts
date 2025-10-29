import { Injectable } from '@nestjs/common';
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
    return this.productRepo.save(product);
  }

  async findById(id: string): Promise<Product | null> {
    return this.productRepo.findOneBy({ id });
  }

  async findAll(): Promise<Product[]> {
    return this.productRepo.find();
  }

  async updateQuantity(
    productId: string,
    qty: number,
  ): Promise<Product | null> {
    await this.productRepo.update(productId, { qty });
    return this.findById(productId);
  }
}
