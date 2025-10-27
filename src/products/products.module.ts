import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from './products.entity';
import { ProductsRepository } from './products.repository';
import { RabbitmqService } from 'src/rabbitmq/rabbitmq.service';
import { OrderEventListenerService } from './orderEventListener.service';

@Module({
  imports: [TypeOrmModule.forFeature([Product])],
  providers: [
    ProductsService,
    ProductsRepository,
    RabbitmqService,
    OrderEventListenerService
  ],
  controllers: [ProductsController],
})
export class ProductsModule {}
