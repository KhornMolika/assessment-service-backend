import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
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

  constructor(private readonly clientRepo: ClientRepository) {}

  async create(dto: CreateClientDto): Promise<CreatedClientResult> {
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
  }

  async findAll(): Promise<Client[]> {
    return this.clientRepo.find({ order: { createdAt: 'DESC' } });
  }

  async findOne(id: string): Promise<Client> {
    const client = await this.clientRepo.findOne({ where: { id } });
    if (!client) {
      throw new NotFoundException(`Client lookup failed: The requested client ID '${id}' does not exist`);
    }
    return client;
  }

  async update(id: string, dto: UpdateClientDto): Promise<Client> {
    const client = await this.findOne(id);
    Object.assign(client, dto);
    return this.clientRepo.save(client);
  }

  async rotateSecret(id: string): Promise<CreatedClientResult> {
    const client = await this.findOne(id);
    const rawSecret = this.generateSecret();
    client.clientSecretHash = await argon2.hash(rawSecret, this.argon2Options);
    return { client: await this.clientRepo.save(client), rawSecret };
  }

  async setActive(id: string, isActive: boolean): Promise<Client> {
    const client = await this.findOne(id);
    client.isActive = isActive;
    return this.clientRepo.save(client);
  }

  // Used by AuthService.token() — single source of truth for credential validation
  async verifySecret(clientId: string, rawSecret: string): Promise<Client | null> {
    const client = await this.clientRepo.findByClientId(clientId);
    if (!client || !client.isActive) return null;
    const valid = await argon2.verify(client.clientSecretHash, rawSecret, this.argon2Options);
    return valid ? client : null;
    // Note: do NOT distinguish "inactive" from "wrong secret" — both return null
    // This prevents information leakage about whether a clientId exists
  }

  // 64 hex chars (32 bytes entropy) — cryptographically unguessable
  private generateSecret(): string {
    return randomUUID().replace(/-/g, '') + randomUUID().replace(/-/g, '');
  }
}
