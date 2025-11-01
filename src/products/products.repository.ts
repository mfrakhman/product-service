import { Injectable, BadRequestException } from '@nestjs/common';
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
    quantity: number,
  ): Promise<Product | null> {
    const result = await this.productRepo
      .createQueryBuilder()
      .update(Product)
      .set({ qty: () => `qty - ${quantity}` })
      .where('id = :id', { id: productId })
      .andWhere('qty >= :quantity', { quantity })
      .returning('*')
      .execute();

    if (result.affected === 0) {
      throw new BadRequestException('Insufficient stock or invalid product');
    }

    return result.raw[0];
  }
}
