import { Test, TestingModule } from '@nestjs/testing';
import { CacheService } from './cache.service';
import { getRedisToken } from '@nestjs-modules/ioredis';

describe('CacheService', () => {
  let service: CacheService;
  let redisMock: any;

  beforeEach(() => {
    redisMock = {
      get: jest.fn(),
      setex: jest.fn(),
      del: jest.fn(),
      keys: jest.fn(),
    };

    service = new CacheService(redisMock as any);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getOrSet', () => {
    it('should return cached value if exists', async () => {
      redisMock.get.mockResolvedValue('{"foo":"bar"}');
      const factory = jest.fn();

      const result = await service.getOrSet('key1', 60, factory);
      
      expect(result).toEqual({ foo: 'bar' });
      expect(redisMock.get).toHaveBeenCalledWith('key1');
      expect(factory).not.toHaveBeenCalled();
      expect(redisMock.setex).not.toHaveBeenCalled();
    });

    it('should call factory and cache value if not exists', async () => {
      redisMock.get.mockResolvedValue(null);
      const factory = jest.fn().mockResolvedValue({ foo: 'baz' });

      const result = await service.getOrSet('key2', 60, factory);

      expect(result).toEqual({ foo: 'baz' });
      expect(redisMock.get).toHaveBeenCalledWith('key2');
      expect(factory).toHaveBeenCalled();
      expect(redisMock.setex).toHaveBeenCalledWith('key2', 60, '{"foo":"baz"}');
    });

    it('should propagate factory error and not cache anything', async () => {
      redisMock.get.mockResolvedValue(null);
      const error = new Error('Factory Failed');
      const factory = jest.fn().mockRejectedValue(error);

      await expect(service.getOrSet('key3', 60, factory)).rejects.toThrow('Factory Failed');
      
      expect(redisMock.get).toHaveBeenCalledWith('key3');
      expect(factory).toHaveBeenCalled();
      expect(redisMock.setex).not.toHaveBeenCalled();
    });

    it('should propagate JSON.parse error if cache is corrupted', async () => {
      redisMock.get.mockResolvedValue('invalid json');
      const factory = jest.fn();

      await expect(service.getOrSet('key4', 60, factory)).rejects.toThrow(SyntaxError);
      
      expect(redisMock.get).toHaveBeenCalledWith('key4');
      expect(factory).not.toHaveBeenCalled();
    });

    it('should propagate redis get error', async () => {
      redisMock.get.mockRejectedValue(new Error('Redis Get Error'));
      const factory = jest.fn();

      await expect(service.getOrSet('key5', 60, factory)).rejects.toThrow('Redis Get Error');
      expect(factory).not.toHaveBeenCalled();
    });

    it('should propagate redis setex error', async () => {
      redisMock.get.mockResolvedValue(null);
      redisMock.setex.mockRejectedValue(new Error('Redis Set Error'));
      const factory = jest.fn().mockResolvedValue('val');

      await expect(service.getOrSet('key6', 60, factory)).rejects.toThrow('Redis Set Error');
    });
  });

  describe('invalidate', () => {
    it('should do nothing if keys are empty', async () => {
      await service.invalidate();
      expect(redisMock.del).not.toHaveBeenCalled();
    });

    it('should call redis del with keys', async () => {
      redisMock.del.mockResolvedValue(2);
      await service.invalidate('k1', 'k2');
      expect(redisMock.del).toHaveBeenCalledWith('k1', 'k2');
    });

    it('should propagate redis del error', async () => {
      redisMock.del.mockRejectedValue(new Error('Redis Del Error'));
      await expect(service.invalidate('k1')).rejects.toThrow('Redis Del Error');
    });
  });

  describe('invalidatePattern', () => {
    it('should do nothing if no keys match pattern', async () => {
      redisMock.keys.mockResolvedValue([]);
      await service.invalidatePattern('prefix:*');
      expect(redisMock.keys).toHaveBeenCalledWith('prefix:*');
      expect(redisMock.del).not.toHaveBeenCalled();
    });

    it('should call redis del with matched keys', async () => {
      redisMock.keys.mockResolvedValue(['prefix:1', 'prefix:2']);
      redisMock.del.mockResolvedValue(2);
      await service.invalidatePattern('prefix:*');
      expect(redisMock.keys).toHaveBeenCalledWith('prefix:*');
      expect(redisMock.del).toHaveBeenCalledWith('prefix:1', 'prefix:2');
    });

    it('should propagate redis keys error', async () => {
      redisMock.keys.mockRejectedValue(new Error('Redis Keys Error'));
      await expect(service.invalidatePattern('prefix:*')).rejects.toThrow('Redis Keys Error');
      expect(redisMock.del).not.toHaveBeenCalled();
    });

    it('should propagate redis del error during invalidatePattern', async () => {
      redisMock.keys.mockResolvedValue(['prefix:1']);
      redisMock.del.mockRejectedValue(new Error('Redis Del Error'));
      await expect(service.invalidatePattern('prefix:*')).rejects.toThrow('Redis Del Error');
    });
  });
});
