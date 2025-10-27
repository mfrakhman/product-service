import { Injectable, OnModuleInit } from '@nestjs/common';
import * as amqp from 'amqplib';
import { log } from 'console';

@Injectable()
export class RabbitmqService implements OnModuleInit {
  private channel: amqp.Channel;
  private readonly exchange = 'events';
  private isReady: Promise<void>;

  async onModuleInit() {
    this.isReady = this.init();
  }

  private async init() {
    console.log('Connecting to RabbitMQ...');
    const connection = await amqp.connect(process.env.RABBITMQ_URL);
    console.log('RabbitMQ Connection established');

    this.channel = await connection.createChannel();
    console.log('RabbitMQ Channel created');

    await this.channel.assertExchange(this.exchange, 'topic', {
      durable: false,
    });
    console.log(`RabbitMQ Exchange ${this.exchange} asserted`);

    connection.on('error', (err) => {
      console.error('RabbitMQ connection error:', err);
    });
    connection.on('close', () => {
      console.error('RabbitMQ connection closed');
    });

    console.log('RabbitMQ Service is ready to publish and consume messages');
  }

  private async ensureConnected() {
    if (!this.channel) {
      await this.isReady;
    }
  }

  async publish(event: string, data: any) {
    await this.ensureConnected();
    const payload = Buffer.from(JSON.stringify(data));
    this.channel.publish(this.exchange, event, payload);
    console.log(`Event published: ${event}`);
  }

  async createConsumer(
    routingKey: string,
    onMessage: (msg: any) => Promise<void>,
  ) {
    await this.ensureConnected();

    log(`Setting up consumer for routing key: ${routingKey}`);
    const q = await this.channel.assertQueue('', { exclusive: true });
    await this.channel.bindQueue(q.queue, this.exchange, routingKey);

    this.channel.consume(q.queue, async (msg) => {
      if (!msg) return;
      const content = JSON.parse(msg.content.toString());
      console.log(`RabbitMQ Message received on ${routingKey}:`, content);
      await onMessage(content);
      this.channel.ack(msg);
    });
    console.log(`RabbitMQ Listening for message on ${routingKey}`);
  }
}
