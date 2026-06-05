import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ClientService } from './client.service';
import { ClientRepository } from './client.repository';
import { CacheService } from '../../common/cache/cache.service';
import * as argon2 from 'argon2';

jest.mock('argon2', () => ({
  hash: jest.fn(),
  verify: jest.fn(),
  argon2id: 2,
}));

describe('ClientService', () => {
  let service: ClientService;
  let clientRepositoryMock: any;
  let cacheServiceMock: any;

  beforeEach(async () => {
    clientRepositoryMock = {
      findBySlug: jest.fn(),
      findByClientId: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };
    cacheServiceMock = {
      invalidate: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClientService,
        { provide: ClientRepository, useValue: clientRepositoryMock },
        { provide: CacheService, useValue: cacheServiceMock },
      ],
    }).compile();

    service = module.get<ClientService>(ClientService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should throw ConflictException if slug exists', async () => {
      clientRepositoryMock.findBySlug.mockResolvedValue({
        id: '1',
        slug: 'test',
      });
      await expect(
        service.create({ slug: 'test', name: 'Test' }),
      ).rejects.toThrow(ConflictException);
    });

    it('should create successfully and return raw secret', async () => {
      clientRepositoryMock.findBySlug.mockResolvedValue(null);
      (argon2.hash as jest.Mock).mockResolvedValue('hashed_secret');
      clientRepositoryMock.create.mockReturnValue({
        id: '1',
        slug: 'test',
        clientSecretHash: 'hashed_secret',
      });
      clientRepositoryMock.save.mockResolvedValue({
        id: '1',
        slug: 'test',
        clientSecretHash: 'hashed_secret',
      });

      const result = await service.create({ slug: 'test', name: 'Test' });
      expect(result.client.id).toBe('1');
      expect(result.rawSecret).toBeDefined();
      expect(clientRepositoryMock.save).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return clients', async () => {
      clientRepositoryMock.find.mockResolvedValue([{ id: '1' }]);
      const result = await service.findAll();
      expect(result).toHaveLength(1);
    });
  });

  describe('findOne', () => {
    it('should throw NotFoundException if not found', async () => {
      clientRepositoryMock.findOne.mockResolvedValue(null);
      await expect(service.findOne('1')).rejects.toThrow(NotFoundException);
    });

    it('should return client if found', async () => {
      clientRepositoryMock.findOne.mockResolvedValue({ id: '1' });
      const result = await service.findOne('1');
      expect(result.id).toBe('1');
    });
  });

  describe('update', () => {
    it('should update client and invalidate cache', async () => {
      clientRepositoryMock.findOne.mockResolvedValue({
        id: '1',
        clientId: 'c1',
      });
      clientRepositoryMock.save.mockResolvedValue({
        id: '1',
        clientId: 'c1',
        name: 'New',
      });

      const result = await service.update('1', { name: 'New' });
      expect(result.name).toBe('New');
      expect(cacheServiceMock.invalidate).toHaveBeenCalledWith('client:c1');
    });
  });

  describe('rotateSecret', () => {
    it('should rotate secret and invalidate cache', async () => {
      clientRepositoryMock.findOne.mockResolvedValue({
        id: '1',
        clientId: 'c1',
      });
      (argon2.hash as jest.Mock).mockResolvedValue('new_hash');
      clientRepositoryMock.save.mockResolvedValue({
        id: '1',
        clientId: 'c1',
        clientSecretHash: 'new_hash',
      });

      const result = await service.rotateSecret('1');
      expect(result.rawSecret).toBeDefined();
      expect(clientRepositoryMock.save).toHaveBeenCalled();
      expect(cacheServiceMock.invalidate).toHaveBeenCalledWith('client:c1');
    });
  });

  describe('setActive', () => {
    it('should set active and invalidate cache', async () => {
      clientRepositoryMock.findOne.mockResolvedValue({
        id: '1',
        clientId: 'c1',
      });
      clientRepositoryMock.save.mockResolvedValue({
        id: '1',
        clientId: 'c1',
        isActive: false,
      });

      const result = await service.setActive('1', false);
      expect(result.isActive).toBe(false);
      expect(cacheServiceMock.invalidate).toHaveBeenCalledWith('client:c1');
    });
  });

  describe('verifySecret', () => {
    it('should return null if client not found', async () => {
      clientRepositoryMock.findByClientId.mockResolvedValue(null);
      const result = await service.verifySecret('c1', 'raw');
      expect(result).toBeNull();
    });

    it('should return null if client is not active', async () => {
      clientRepositoryMock.findByClientId.mockResolvedValue({
        id: '1',
        isActive: false,
      });
      const result = await service.verifySecret('c1', 'raw');
      expect(result).toBeNull();
    });

    it('should return null if secret is invalid', async () => {
      clientRepositoryMock.findByClientId.mockResolvedValue({
        id: '1',
        isActive: true,
        clientSecretHash: 'hash',
      });
      (argon2.verify as jest.Mock).mockResolvedValue(false);
      const result = await service.verifySecret('c1', 'raw');
      expect(result).toBeNull();
    });

    it('should return client if secret is valid', async () => {
      clientRepositoryMock.findByClientId.mockResolvedValue({
        id: '1',
        isActive: true,
        clientSecretHash: 'hash',
      });
      (argon2.verify as jest.Mock).mockResolvedValue(true);
      const result = await service.verifySecret('c1', 'raw');
      expect(result?.id).toBe('1');
    });
  });
});
