// src/common/base/client-repository.ts
import {
  DataSource,
  Repository,
  FindOptionsWhere,
  ObjectLiteral,
  ILike,
  Raw,
} from 'typeorm';
import { RequestContext } from '../context/request-context';
import { PaginationQueryDto } from '../dto/pagination-query.dto';

export abstract class ClientRepository<
  T extends ObjectLiteral & { clientId: string },
> {
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

  async findPaginated(
    query: PaginationQueryDto,
    searchFields: (keyof T)[],
    relations: string[] = [],
  ) {
    const { page, limit, search, sortBy, order, visibility, tag, topicId } =
      query;
    const skip = (page - 1) * limit;

    // 1. Build the explicit base filters
    const explicitFilters: any = {};

    if (visibility) {
      explicitFilters.visibility = visibility;
    }

    if (tag) {
      explicitFilters.tags = Raw((alias) => `:tag = ANY(${alias})`, { tag });
    }

    // 2. FIXED: Multi-relation Many-to-Many nesting filter check
    if (topicId) {
      explicitFilters.topics = { id: topicId }; // TypeORM resolves this to an INNER JOIN on the junction table
    }

    const baseWhere = this.scope(explicitFilters);
    let whereConditions: FindOptionsWhere<T> | FindOptionsWhere<T>[] =
      baseWhere;

    // 3. ONLY create an OR array block if a search keyword is actually provided
    if (search && search.trim() !== '' && searchFields.length > 0) {
      whereConditions = searchFields.map((field) => ({
        ...baseWhere,
        [field]: ILike(`%${search.trim()}%`),
      }));
    }

    // 4. Return paginated results and pass the relations array down cleanly
    return this.repository.findAndCount({
      where: whereConditions,
      relations, // 👈 Added relations array parameter to load linked tables (like 'topics') dynamically
      order: { [sortBy]: order.toUpperCase() } as any,
      skip,
      take: limit,
    });
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
