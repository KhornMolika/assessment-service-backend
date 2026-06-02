import { ConflictException, Injectable, NotFoundException, InternalServerErrorException, Logger, HttpException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { randomUUID } from 'crypto';
import { ClientRepository } from './client.repository';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { Client } from './client.entity';

export interface CreatedClientResult {
  client: Client;
  rawSecret: string; // returned once to caller — never stored raw
}

@Injectable()
export class ClientService {
  // Argon2id options — OWASP minimum is memoryCost:19456, timeCost:2
  // 64 MB / 3 iterations is comfortably above minimum for infrequent server-to-server auth
  private readonly argon2Options: argon2.Options & { raw?: false } = {
    type: argon2.argon2id,
    memoryCost: 64 * 1024, // 64 MB
    timeCost: 3,
    parallelism: 1,
  };

  private readonly logger = new Logger(ClientService.name);

  constructor(private readonly clientRepo: ClientRepository) {}

  async create(dto: CreateClientDto): Promise<CreatedClientResult> {
    try {
      const existing = await this.clientRepo.findBySlug(dto.slug);
      if (existing) {
        throw new ConflictException(`Client provisioning failed: The slug '${dto.slug}' is already in use by another client`);
      }

      const rawSecret = this.generateSecret();
      const clientSecretHash = await argon2.hash(rawSecret, this.argon2Options);

      const client = this.clientRepo.create({
        ...dto,
        clientId: randomUUID(),
        clientSecretHash,
        isActive: true,
      });

      const saved = await this.clientRepo.save(client);
      return { client: saved, rawSecret };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`Failed to create client: ${(error as Error).message}`, (error as Error).stack);
      throw new InternalServerErrorException('An unexpected error occurred while provisioning the client');
    }
  }

  async findAll(): Promise<Client[]> {
    try {
      return await this.clientRepo.find({ order: { createdAt: 'DESC' } });
    } catch (error) {
      this.logger.error(`Failed to fetch clients: ${(error as Error).message}`, (error as Error).stack);
      throw new InternalServerErrorException('An unexpected error occurred while fetching clients');
    }
  }

  async findOne(id: string): Promise<Client> {
    try {
      const client = await this.clientRepo.findOne({ where: { id } });
      if (!client) {
        throw new NotFoundException(`Client lookup failed: The requested client ID '${id}' does not exist`);
      }
      return client;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`Failed to find client with ID ${id}: ${(error as Error).message}`, (error as Error).stack);
      throw new InternalServerErrorException('An unexpected error occurred while looking up the client');
    }
  }

  async update(id: string, dto: UpdateClientDto): Promise<Client> {
    try {
      const client = await this.findOne(id);
      Object.assign(client, dto);
      return await this.clientRepo.save(client);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`Failed to update client ${id}: ${(error as Error).message}`, (error as Error).stack);
      throw new InternalServerErrorException('An unexpected error occurred while updating the client');
    }
  }

  async rotateSecret(id: string): Promise<CreatedClientResult> {
    try {
      const client = await this.findOne(id);
      const rawSecret = this.generateSecret();
      client.clientSecretHash = await argon2.hash(rawSecret, this.argon2Options);
      const saved = await this.clientRepo.save(client);
      return { client: saved, rawSecret };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`Failed to rotate secret for client ${id}: ${(error as Error).message}`, (error as Error).stack);
      throw new InternalServerErrorException('An unexpected error occurred while rotating the client secret');
    }
  }

  async setActive(id: string, isActive: boolean): Promise<Client> {
    try {
      const client = await this.findOne(id);
      client.isActive = isActive;
      return await this.clientRepo.save(client);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`Failed to set active status for client ${id}: ${(error as Error).message}`, (error as Error).stack);
      throw new InternalServerErrorException('An unexpected error occurred while updating the client active status');
    }
  }

  // Used by AuthService.token() — single source of truth for credential validation
  async verifySecret(clientId: string, rawSecret: string): Promise<Client | null> {
    try {
      const client = await this.clientRepo.findByClientId(clientId);
      if (!client || !client.isActive) return null;
      const valid = await argon2.verify(client.clientSecretHash, rawSecret, this.argon2Options);
      return valid ? client : null;
    } catch (error) {
      this.logger.error(`Failed to verify secret for clientId ${clientId}: ${(error as Error).message}`, (error as Error).stack);
      throw new InternalServerErrorException('An unexpected error occurred during secret verification');
    }
    // Note: do NOT distinguish "inactive" from "wrong secret" — both return null
    // This prevents information leakage about whether a clientId exists
  }

  // 64 hex chars (32 bytes entropy) — cryptographically unguessable
  private generateSecret(): string {
    return randomUUID().replace(/-/g, '') + randomUUID().replace(/-/g, '');
  }
}
