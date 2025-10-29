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
        // Optionally requeue or move to DLQ
        this.channel.nack(msg, false, false);
      }
    });
  }

  // async onModuleInit() {
  //   this.isReady = this.init();
  // }

  // private async init() {
  //   console.log('Connecting to RabbitMQ...');
  //   const connection = await amqp.connect(process.env.RABBITMQ_URL);
  //   console.log('RabbitMQ Connection established');

  //   this.channel = await connection.createChannel();
  //   console.log('RabbitMQ Channel created');

  //   await this.channel.assertExchange(this.exchange, 'topic', {
  //     durable: false,
  //   });
  //   console.log(`RabbitMQ Exchange ${this.exchange} asserted`);

  //   connection.on('error', (err) => {
  //     console.error('RabbitMQ connection error:', err);
  //   });
  //   connection.on('close', () => {
  //     console.error('RabbitMQ connection closed');
  //   });

  //   console.log('RabbitMQ Service is ready to publish and consume messages');
  // }

  // private async ensureConnected() {
  //   if (!this.channel) {
  //     await this.isReady;
  //   }
  // }

  // async publish(event: string, data: any) {
  //   await this.ensureConnected();
  //   const payload = Buffer.from(JSON.stringify(data));
  //   this.channel.publish(this.exchange, event, payload);
  //   console.log(`Event published: ${event}`);
  // }

  // async createConsumer(
  //   routingKey: string,
  //   onMessage: (msg: any) => Promise<void>,
  // ) {
  //   await this.ensureConnected();

  //   log(`Setting up consumer for routing key: ${routingKey}`);
  //   const q = await this.channel.assertQueue('', { exclusive: true });
  //   await this.channel.bindQueue(q.queue, this.exchange, routingKey);

  //   this.channel.consume(q.queue, async (msg) => {
  //     if (!msg) return;
  //     const content = JSON.parse(msg.content.toString());
  //     console.log(`RabbitMQ Message received on ${routingKey}:`, content);
  //     await onMessage(content);
  //     this.channel.ack(msg);
  //   });
  //   console.log(`RabbitMQ Listening for message on ${routingKey}`);
  // }
}
