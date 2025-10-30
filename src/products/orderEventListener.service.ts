import { Injectable, OnModuleInit } from '@nestjs/common';
import { RabbitmqService } from '../rabbitmq/rabbitmq.service';
import { ProductsService } from './products.service';

@Injectable()
export class OrderEventListenerService implements OnModuleInit {
  constructor(
    private readonly productsService: ProductsService,
    private readonly rabbitmqService: RabbitmqService,
  ) {}

  async onModuleInit() {
    await this.rabbitmqService.consume(
      'order.exchange',
      'product_order_queue',
      'order.created',
      async (order) => {
        try {
          const { productId, quantity } = order;
          const reduceStock = await this.productsService.decreaseQuantity(
            productId,
            quantity,
          );
          console.log(reduceStock);
        } catch (error) {
          throw error;
        }
      },
    );
  }
}
