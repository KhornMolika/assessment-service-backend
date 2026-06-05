import { Test, TestingModule } from '@nestjs/testing';
import { JwtStrategy, JwtPayload } from './jwt.strategy';
import { ConfigService } from '@nestjs/config';
import { ClientRepository } from '../../clients/client.repository';
import { CacheService } from '../../../common/cache/cache.service';
import { UnauthorizedException } from '@nestjs/common';
import { Client } from '../../clients/client.entity';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let clientRepo: jest.Mocked<ClientRepository>;
  let cacheService: jest.Mocked<CacheService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn().mockReturnValue('test-secret'),
            get: jest.fn().mockReturnValue(3600),
          },
        },
        {
          provide: ClientRepository,
          useValue: {
            findByClientId: jest.fn(),
          },
        },
        {
          provide: CacheService,
          useValue: {
            getOrSet: jest.fn(),
          },
        },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
    clientRepo = module.get(ClientRepository);
    cacheService = module.get(CacheService);
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  describe('validate', () => {
    const payload: JwtPayload = {
      sub: 'client-123',
      slug: 'client-slug',
      scopes: ['read'],
    };

    it('returns client for valid payload (cache hit)', async () => {
      const mockClient = { id: 'db-id', clientId: 'client-123', isActive: true } as Client;
      cacheService.getOrSet.mockResolvedValue(mockClient);

      const result = await strategy.validate(payload);

      expect(result).toEqual(mockClient);
      expect(cacheService.getOrSet).toHaveBeenCalledWith(
        'client:client-123',
        3600,
        expect.any(Function),
      );
    });

    it('hits DB on cache miss and returns client', async () => {
      const mockClient = { id: 'db-id', clientId: 'client-123', isActive: true } as Client;

      cacheService.getOrSet.mockImplementation(async (key, ttl, factory) => {
        return await factory();
      });

      clientRepo.findByClientId.mockResolvedValue(mockClient);

      const result = await strategy.validate(payload);

      expect(result).toEqual(mockClient);
      expect(clientRepo.findByClientId).toHaveBeenCalledWith('client-123');
    });

    it('throws UnauthorizedException if client not found in DB', async () => {
      cacheService.getOrSet.mockImplementation(async (key, ttl, factory) => {
        return await factory();
      });

      clientRepo.findByClientId.mockResolvedValue(null);

      await expect(strategy.validate(payload)).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException if client is inactive', async () => {
      const mockClient = { id: 'db-id', clientId: 'client-123', isActive: false } as Client;
      
      cacheService.getOrSet.mockImplementation(async (key, ttl, factory) => {
        return await factory();
      });

      clientRepo.findByClientId.mockResolvedValue(mockClient);

      await expect(strategy.validate(payload)).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException if cache directly returns null', async () => {
      cacheService.getOrSet.mockResolvedValue(null);

      await expect(strategy.validate(payload)).rejects.toThrow(UnauthorizedException);
    });
  });
});
