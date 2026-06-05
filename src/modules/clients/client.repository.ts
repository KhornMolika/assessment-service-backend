import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Client } from './client.entity';

@Injectable()
export class ClientRepository extends Repository<Client> {
  constructor(private readonly dataSource: DataSource) {
    super(Client, dataSource.createEntityManager());
  }

  async findByClientId(clientId: string): Promise<Client | null> {
    return this.findOne({ where: { clientId } });
  }

  async findBySlug(slug: string): Promise<Client | null> {
    return this.findOne({ where: { slug } });
  }
}
