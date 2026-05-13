// src/common/base/client-repository.ts
import {
  DataSource,
  Repository,
  FindOptionsWhere,
  ObjectLiteral,
} from 'typeorm';
import { RequestContext } from '../context/request-context';

export abstract class ClientRepository<T extends ObjectLiteral & { clientId: string }> {
  protected repository: Repository<T>;

  constructor(
    protected readonly dataSource: DataSource,
    entity: new () => T,
    protected readonly context: RequestContext,
  ) {
    this.repository = dataSource.getRepository(entity);
  }

  // HARD GUARANTEE: every query is scoped
  protected scope(where: FindOptionsWhere<T> = {}): FindOptionsWhere<T> {
    return {
      ...where,
      clientId: this.context.clientId,
    };
  }

  async findAll(where: FindOptionsWhere<T> = {}) {
    return this.repository.find({
      where: this.scope(where),
    });
  }

  async findOne(where: FindOptionsWhere<T>) {
    return this.repository.findOne({
      where: this.scope(where),
    });
  }

  async create(data: Partial<T>) {
    return this.repository.save({
      ...data,
      clientId: this.context.clientId,
    } as T);
  }

  async update(where: FindOptionsWhere<T>, data: Partial<T>) {
    return this.repository.update(this.scope(where), data);
  }

  async softDelete(where: FindOptionsWhere<T>) {
    return this.repository.softDelete(this.scope(where));
  }
}