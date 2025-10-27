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
    await this.rabbitmqService.createConsumer(
      'order_created',
      async (payload) => {
        console.log('Recieved order_created event:', payload);
        await this.productsService.handleOrderCreatedEvent(payload);
      },
    );
  }
}
