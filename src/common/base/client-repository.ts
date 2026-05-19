import {
  Repository,
  FindOptionsWhere,
  DeepPartial,
  SelectQueryBuilder,
  UpdateResult,
  DeleteResult,
  ILike,
} from 'typeorm';
import { ClientContextService } from '../context/client-context.service';
import { ClientScopedEntity } from './client-scoped.entity';

export class ClientRepository<T extends ClientScopedEntity> {
  constructor(protected readonly repo: Repository<T>) {}

  private get clientId(): string {
    return ClientContextService.getClientId();
  }

  protected clientWhere(where: FindOptionsWhere<T> | FindOptionsWhere<T>[]): FindOptionsWhere<T> | FindOptionsWhere<T>[] {
    if (Array.isArray(where)) {
      return where.map(w => ({ ...w, clientId: this.clientId } as FindOptionsWhere<T>));
    }
    return { ...where, clientId: this.clientId } as FindOptionsWhere<T>;
  }

  // Alias for clientWhere to avoid breaking existing services calling scope
  scope(where: FindOptionsWhere<T> = {}): FindOptionsWhere<T> {
    return this.clientWhere(where) as FindOptionsWhere<T>;
  }

  find(where: FindOptionsWhere<T> = {}): Promise<T[]> {
    return this.repo.find({ where: this.clientWhere(where) });
  }

  findOne(where: FindOptionsWhere<T>): Promise<T | null> {
    return this.repo.findOne({ where: this.clientWhere(where) });
  }

  findById(id: string, relations: string[] = []): Promise<T | null> {
    return this.repo.findOne({
      where: this.clientWhere({ id } as FindOptionsWhere<T>),
      relations
    });
  }

  create(data: DeepPartial<T>): Promise<T> {
    return this.save(data);
  }

  async findPaginated(
    query: any,
    searchFields: (keyof T)[],
    relations: string[] = [],
  ) {
    const { page = 1, limit = 10, search, sortBy = 'createdAt', order = 'DESC', visibility, tag, topicId, assessmentId } = query;
    const skip = (page - 1) * limit;

    const explicitFilters: any = {};
    if (visibility && this.repo.metadata.columns.some(c => c.propertyName === 'visibility')) explicitFilters.visibility = visibility;
    if (tag && this.repo.metadata.columns.some(c => c.propertyName === 'tags')) explicitFilters.tags = tag;
    if (topicId && this.repo.metadata.relations.some(r => r.propertyName === 'topic')) explicitFilters.topic = { id: topicId };
    if (assessmentId && this.repo.metadata.relations.some(r => r.propertyName === 'assessment')) explicitFilters.assessment = { id: assessmentId };

    let baseWhere = this.clientWhere(explicitFilters);
    let whereConditions: any = baseWhere;

    if (search && search.trim() !== '' && searchFields.length > 0) {
      whereConditions = searchFields.map((field) => ({
        ...baseWhere,
        [field]: ILike(`%${search.trim()}%`),
      }));
    }

    return this.repo.findAndCount({
      where: whereConditions,
      relations,
      order: { [sortBy]: order.toUpperCase() } as any,
      skip,
      take: limit,
    });
  }

  save(data: DeepPartial<T>): Promise<T> {
    return this.repo.save({
      ...data,
      clientId: this.clientId,
    } as T);
  }

  update(where: FindOptionsWhere<T>, data: DeepPartial<T>): Promise<UpdateResult> {
    return this.repo.update(this.clientWhere(where), data as any);
  }

  softDelete(where: FindOptionsWhere<T>): Promise<UpdateResult> {
    return this.repo.softDelete(this.clientWhere(where));
  }

  hardDelete(where: FindOptionsWhere<T>): Promise<DeleteResult> {
    return this.repo.delete(this.clientWhere(where));
  }

  protected qb(alias: string): SelectQueryBuilder<T> {
    return this.repo
      .createQueryBuilder(alias)
      .andWhere(`${alias}.clientId = :clientId`, { clientId: this.clientId });
  }

  get unsafe(): never {
    throw new Error(
      'Direct repository access is disabled. Use ClientRepository methods only.',
    );
  }
}
