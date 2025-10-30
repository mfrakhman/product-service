import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';

@Injectable()
export class ProductCacheService {
  @Inject(CACHE_MANAGER)
  private cacheManager: Cache;
  constructor() {}

  private readonly TTL = 60;

  async getCachedProduct(productId: string): Promise<any | null> {
    return this.cacheManager.get(`product:${productId}`);
  }

  async setCachedProduct(productId: string, product: any): Promise<void> {
    await this.cacheManager.set(`product:${productId}`, product, this.TTL);
  }

  async invalidateProductCache(productId: string): Promise<void> {
    await this.cacheManager.del(`product:${productId}`);
  }
}
