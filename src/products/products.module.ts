import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from './products.entity';
import { ProductsRepository } from './products.repository';
import { OrderEventListenerService } from './orderEventListener.service';
import { ProductCacheService } from './product-cache.service';
import { RabbitmqModule } from 'src/rabbitmq/rabbitmq.module';

@Module({
  imports: [TypeOrmModule.forFeature([Product]), RabbitmqModule],
  controllers: [ProductsController],
  providers: [
    ProductsService,
    ProductsRepository,
    OrderEventListenerService,
    ProductCacheService,
  ],
})
export class ProductsModule {}
