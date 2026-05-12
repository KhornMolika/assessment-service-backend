import {
  DataSource,
  EntityTarget,
  ObjectLiteral,
  Repository,
} from 'typeorm';
import { Context } from '../context/context.helper';


export abstract class TenantRepository<T extends ObjectLiteral> {
  protected repository: Repository<T>;

  constructor(
    protected readonly dataSource: DataSource,
    entity: EntityTarget<T>,
  ) {
    this.repository = dataSource.getRepository(entity);
  }

  protected clientId(): string {
    return Context.clientId();
  }

  protected withClient(where: Partial<T> = {}): Partial<T> {
    return {
      ...where,
      clientId: this.clientId(),
    } as Partial<T>;
  }
}