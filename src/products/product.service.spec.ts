import { Test, TestingModule } from '@nestjs/testing';
import { ProductsService } from './products.service';
import { ProductsRepository } from './products.repository';
import { ProductCacheService } from './product-cache.service';
import { RabbitmqService } from '../rabbitmq/rabbitmq.service';

describe('ProductsService', () => {
  let service: ProductsService;
  let repo: Partial<ProductsRepository>;
  let cache: Partial<ProductCacheService>;
  let rabbitmq: Partial<RabbitmqService>;

  beforeEach(async () => {
    repo = {
      createProduct: jest
        .fn()
        .mockImplementation((dto) => Promise.resolve({ id: '1', ...dto })),
      findById: jest.fn(),
      findAll: jest.fn(),
      updateQuantity: jest.fn(),
    };

    cache = {
      setCachedProduct: jest.fn(),
      getCachedProduct: jest.fn(),
    };

    rabbitmq = {
      publish: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: ProductsRepository, useValue: repo },
        { provide: ProductCacheService, useValue: cache },
        { provide: RabbitmqService, useValue: rabbitmq },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
  });

  it('should create a product and cache it', async () => {
    const dto = { name: 'Keyboard', price: 100000, quantity: 10 };
    const result = await service.createProduct(dto as any);

    expect(result).toHaveProperty('id');
    expect(result.name).toBe('Keyboard');
    expect(cache.setCachedProduct).toHaveBeenCalledWith(result.id, result);
    expect(rabbitmq.publish).toHaveBeenCalledWith(
      'product.exchange',
      'product.created',
      result,
    );
  });
});
