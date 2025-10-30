import { Injectable, OnModuleInit } from '@nestjs/common';
import { Channel, Connection, connect } from 'amqplib';

@Injectable()
export class RabbitmqService implements OnModuleInit {
  private connection: Connection;
  private channel: Channel;

  async onModuleInit() {
    this.connection = await connect(process.env.RABBITMQ_URL);
    this.channel = await this.connection.createChannel();
  }

  async publish(exchange: string, routingKey: string, message: any) {
    await this.channel.assertExchange(exchange, 'topic', { durable: true });
    this.channel.publish(
      exchange,
      routingKey,
      Buffer.from(JSON.stringify(message)),
    );
    console.log(`Published event ${exchange}:${routingKey}`);
  }
  async consume(
    exchange: string,
    queue: string,
    routingKey: string,
    callback: (data: any) => Promise<void>,
  ) {
    await this.channel.assertExchange(exchange, 'topic', { durable: true });
    const q = await this.channel.assertQueue(queue, { durable: true });
    await this.channel.bindQueue(q.queue, exchange, routingKey);

    this.channel.consume(q.queue, async (msg) => {
      if (!msg) return;
      const data = JSON.parse(msg.content.toString());
      console.log(`Received message ${exchange}:${routingKey}`, data);
      try {
        await callback(data);
        this.channel.ack(msg);
      } catch (error) {
        console.error(`Error processing ${routingKey}:`, error);
        this.channel.nack(msg, false, false);
      }
    });
  }
}
