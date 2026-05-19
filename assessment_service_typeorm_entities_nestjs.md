# Assessment Service — NestJS TypeORM Entity Structure (Multi-Tenant Scoped)

## Base Entity

```ts
import {
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Column,
  DeleteDateColumn,
} from "typeorm";
import { Exclude } from "class-transformer";

export abstract class SystemBaseEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  @Exclude()
  deletedAt!: Date;
}
```

---

```ts
export abstract class ClientScopedEntity extends SystemBaseEntity {
  @Index()
  @Column({ type: "uuid", unique: true })
  @Exclude()
  clientId!: string;
}
```

---

# Client

```ts
@Entity()
export class Client extends ClientScopedEntity {
  @Column({ unique: true })
  name: string;

  @Column({ unique: true })
  slug: string;

  @Column({ type: "varchar" })
  clientSecretHash!: string;

  @Column("text", { array: true, nullable: true })
  allowedOrigins!: string[];

  @Column("text", { array: true, nullable: true })
  scopes!: string[];

  @Column({ type: "varchar", nullable: true })
  webhookUrl!: string;

  @Column({ type: "varchar", nullable: true })
  webhookSecret!: string;

  @OneToMany(() => RefreshToken, (t) => t.client)
  refreshTokens!: RefreshToken[];

  @OneToMany(() => Topic, (topic) => topic.client)
  topics: Topic[];
}
```

---

# Topic

```ts
@Entity()
@Index(["clientId", "name"], { unique: true })
export class Topic extends ClientScopedEntity {
  @ManyToOne(() => Client, (client) => client.topics, {
    onDelete: "CASCADE",
  })
  client: Client;

  @Column()
  name: string;

  @Column()
  slug: string;

  @Column({ nullable: true, type: "text" })
  description?: string;

  @OneToMany(() => Question, (question) => question.topic)
  questions: Question[];

  @OneToMany(() => QuestionBank, (bank) => bank.topic)
  questionBanks: QuestionBank[];

  @OneToMany(() => Assessment, (assessment) => assessment.topic)
  assessments: Assessment[];
}
```

---

# Question

```ts
export enum Difficulty {
  EASY = "EASY",
  MEDIUM = "MEDIUM",
  HARD = "HARD",
}

export enum QuestionType {
  SINGLE_CHOICE = "SINGLE_CHOICE",
  MULTIPLE_CHOICE = "MULTIPLE_CHOICE",
  TRUE_FALSE = "TRUE_FALSE",
  SHORT_ANSWER = "SHORT_ANSWER",
  ESSAY = "ESSAY",
}

@Entity()
@Index(["clientId", "topic"], { unique: false })
export class Question extends ClientScopedEntity {
  @ManyToOne(() => Topic, (topic) => topic.questions, {
    onDelete: "CASCADE",
  })
  topic: Topic;

  @Column({ type: "enum", enum: QuestionType })
  type: QuestionType;

  @Column({ type: "text" })
  questionText: string;

  @Column({ type: "enum", enum: Difficulty })
  difficulty!: Difficulty;

  @Column({ default: 1 })
  points: number;

  @Column({ type: "jsonb", nullable: true })
  settings?: Record<string, any>;

  @Column({ type: "jsonb", nullable: true })
  correctAnswer?: Record<string, any>;

  @Column("text", { array: true, default: [] })
  tags: string[];

  @OneToMany(() => QuestionBankQuestion, (bq) => bq.question)
  bankQuestions: QuestionBankQuestion[];

  @OneToMany(() => AssessmentQuestion, (aq) => aq.question)
  assessmentQuestions: AssessmentQuestion[];
}
```

---

# Question Bank

```ts
@Entity()
export class QuestionBank extends ClientScopedEntity {
  @ManyToOne(() => Topic, (topic) => topic.questionBanks, {
    onDelete: "CASCADE",
  })
  topic: Topic;

  @Column()
  name: string;

  @Column({ nullable: true, type: "text" })
  description?: string;

  @Column("text", { array: true, default: [] })
  tags: string[];

  @OneToMany(() => QuestionBankQuestion, (bq) => bq.questionBank)
  questions: QuestionBankQuestion[];
}
```

---

# QuestionBankQuestion

```ts
@Entity()
@Index(["questionBank", "question"], { unique: true })
export class QuestionBankQuestion extends ClientScopedEntity {
  @ManyToOne(() => QuestionBank, (bank) => bank.questions, {
    onDelete: "CASCADE",
  })
  questionBank: QuestionBank;

  @ManyToOne(() => Question, (question) => question.bankQuestions, {
    onDelete: "CASCADE",
  })
  question: Question;

  @Column({ nullable: true })
  order?: number;
}
```

---

# Assessment

```ts
export enum AssessmentStatus {
  DRAFT = "DRAFT",
  PUBLISHED = "PUBLISHED",
  ARCHIVED = "ARCHIVED",
}

@Entity()
export class Assessment extends ClientScopedEntity {
  @ManyToOne(() => Topic, (topic) => topic.assessments, {
    onDelete: "CASCADE",
  })
  topic: Topic;

  @Column()
  name: string;

  @Column({ nullable: true, type: "text" })
  description?: string;

  @Column({
    type: "enum",
    enum: AssessmentStatus,
    default: AssessmentStatus.DRAFT,
  })
  status: AssessmentStatus;

  @OneToOne(() => AssessmentSetting, (s) => s.assessment, { cascade: true })
  settings: AssessmentSetting;

  @OneToMany(() => AssessmentQuestion, (q) => q.assessment)
  questions: AssessmentQuestion[];

  @OneToMany(() => AssessmentParticipant, (p) => p.assessment)
  participants: AssessmentParticipant[];
}
```

---

# AssessmentSetting

```ts
@Entity()
export class AssessmentSetting {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @OneToOne(() => Assessment, (a) => a.settings, { onDelete: "CASCADE" })
  @JoinColumn()
  assessment: Assessment;

  @Column({ type: "enum", enum: Mode })
  mode!: Mode;

  @Column({
    type: "enum",
    enum: QuestionSelection,
    nullable: false,
  })
  questionSelection!: QuestionSelection;

  @Column({
    type: "enum",
    enum: ParticipantIdentity,
  })
  participantIdentity!: ParticipantIdentity;

  @Column({ type: "int" })
  numQuestions!: number;

  @Column({ type: "jsonb", nullable: true })
  selectionRules?: any; // { easy: 3, medium: 4, hard: 3 }

  @Column({ type: "int", nullable: true })
  timeLimit?: number;

  @Column({ type: "timestamp", nullable: true })
  startsAt?: Date;

  @Column({ type: "timestamp", nullable: true })
  endsAt?: Date;

  @Column({ type: "int", nullable: true })
  passMark!: number;

  @Column({ type: "boolean", default: false })
  isShuffle!: boolean;

  @Column({ type: "enum", enum: ShowResults, nullable: true })
  showResults!: ShowResults;

  @Column({ type: "jsonb", nullable: true })
  gradeLabels: any; // [{ name: 'A', min: 90 }]

  @Column({ default: false })
  isAllowShare!: boolean;

  @Column({ default: false })
  allowReview: boolean;
}
```

---

# AssessmentQuestion

```ts
@Entity()
@Index(["assessment", "question"], { unique: true })
export class AssessmentQuestion extends ClientScopedEntity {
  @Column()
  clientId: string;

  @ManyToOne(() => Assessment, (a) => a.questions, { onDelete: "CASCADE" })
  assessment: Assessment;

  @ManyToOne(() => Question, (q) => q.assessmentQuestions, {
    onDelete: "CASCADE",
  })
  question: Question;

  @Column({ default: 1 })
  order: number;

  @Column({ type: "jsonb", nullable: true })
  snapshot?: Record<string, any>;
}
```

---

# Participant

```ts
@Entity()
export class Participant extends ClientScopedEntity {
  @Column()
  clientId: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  email?: string;

  @Column({ nullable: true })
  phone?: string;

  @OneToMany(() => AssessmentParticipant, (a) => a.participant)
  assessments: AssessmentParticipant[];
}
```

---

# AssessmentParticipant

```ts
@Entity()
@Index(["assessment", "participant"], { unique: true })
export class AssessmentParticipant extends ClientScopedEntity {
  

  @ManyToOne(() => Assessment, (a) => a.participants, { onDelete: "CASCADE" })
  assessment: Assessment;

  @ManyToOne(() => Participant, (p) => p.assessments, { onDelete: "CASCADE" })
  participant: Participant;

  @Column({ length: 20})
  status: string;

  @Column({ nullable: true })
  totalScore?: number;

  @OneToMany(() => AnswerSheet, (s) => s.assessmentParticipant)
  answerSheets: AnswerSheet[];
}
```

---

# AnswerSheet

```ts
@Entity()
export class AnswerSheet extends ClientScopedEntity {

  @ManyToOne(() => AssessmentParticipant, (p) => p.answerSheets, {
    onDelete: "CASCADE",
  })
  assessmentParticipant: AssessmentParticipant;

  @Column({ nullable: true })
  totalScore?: number;

  @Column({ nullable: true })
  grade?: string;

  @Column({ default: false })
  isPassed: boolean;

  @Column({ nullable: true })
  startedAt?: Date;

  @Column({ nullable: true })
  submittedAt?: Date;

  @OneToMany(() => AnswerEntry, (e) => e.answerSheet)
  entries: AnswerEntry[];
}
```

---

# AnswerEntry

```ts
export enum GradingStatus {
  PENDING = "PENDING",
  AUTOMATIC = "AUTOMATIC",
  AI_EVALUATED = "AI_EVALUATED",
  MANUAL_REVISED = "MANUAL_REVISED",
}

@Entity()
export class AnswerEntry extends ClientScopedEntity {

  @ManyToOne(() => AnswerSheet, (s) => s.entries, { onDelete: "CASCADE" })
  answerSheet: AnswerSheet;

  @ManyToOne(() => AssessmentQuestion, { onDelete: "CASCADE" })
  assessmentQuestion: AssessmentQuestion;

  @Column({ type: "jsonb", nullable: true })
  response?: Record<string, any>;

  @Column({ nullable: true })
  scoreAwarded?: number;

  @Column({ nullable: true })
  isCorrect?: boolean;

  @Column({ type: "enum", enum: GradingStatus, default: GradingStatus.PENDING })
  gradingStatus: GradingStatus;

  @OneToMany(() => AIGradingJob, (j) => j.answerEntry)
  aiJobs: AIGradingJob[];
}
```

---

# AIGradingJob

```ts
@Entity()
export class AIGradingJob extends ClientScopedEntity {

  @ManyToOne(() => AnswerEntry, (e) => e.aiJobs, { onDelete: "CASCADE" })
  answerEntry: AnswerEntry;

  @Column()
  status: string;

  @Column({ nullable: true, type: "float" })
  score?: number;

  @Column({ nullable: true, type: "float" })
  confidence?: number;

  @Column({ nullable: true, type: "text" })
  feedback?: string;

  @Column({ nullable: true, type: "text" })
  errorMessage?: string;
}
```

<!--

File Structure
src/
├── common/
│   ├── context/
│   │   ├── client.storage.ts
│   │   └── client-context.service.ts
│   ├── middleware/
│   │   └── client.middleware.ts
│   ├── base/
│   │   ├── system-base.entity.ts
│   │   ├── client-scoped.entity.ts
│   │   └── client.repository.ts

1. Storage
typescript// common/context/client.storage.ts
import { AsyncLocalStorage } from 'node:async_hooks';

export interface ClientStore {
  clientId: string;
}

export const clientStorage = new AsyncLocalStorage<ClientStore>();

2. Context Service
typescript// common/context/client-context.service.ts
import { UnauthorizedException } from '@nestjs/common';
import { clientStorage } from './client.storage';

export class ClientContextService {
  static getClientId(): string {
    const store = clientStorage.getStore();

    if (!store?.clientId) {
      throw new UnauthorizedException('No client context');
    }

    return store.clientId;
  }
}

3. Middleware
typescript// common/middleware/client.middleware.ts
import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { isUUID } from 'class-validator';
import { clientStorage } from '../context/client.storage';

@Injectable()
export class ClientMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    // In production: read from verified JWT claim, not raw header
    // const clientId = req.user?.clientId;
    const clientId = req.headers['x-client-id'] as string;

    if (!clientId || !isUUID(clientId)) {
      throw new UnauthorizedException('Invalid or missing client context');
    }

    clientStorage.run({ clientId }, () => next());
  }
}
Register in AppModule:
typescript// app.module.ts
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(ClientMiddleware).forRoutes('*');
  }
}

4. Base Entities
typescript// common/base/system-base.entity.ts
import { PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, DeleteDateColumn } from 'typeorm';
import { Exclude } from 'class-transformer';

export abstract class SystemBaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;

  @DeleteDateColumn({ type: 'timestamp' })
  @Exclude()
  deletedAt?: Date;
}
typescript// common/base/client-scoped.entity.ts
import { Column, Index } from 'typeorm';
import { Exclude } from 'class-transformer';
import { SystemBaseEntity } from './system-base.entity';

export abstract class ClientScopedEntity extends SystemBaseEntity {
  @Index()
  @Column({ type: 'uuid' })
  @Exclude()
  clientId!: string;
}

5. Client Repository
typescript// common/base/client.repository.ts
import {
  Repository,
  FindOptionsWhere,
  DeepPartial,
  SelectQueryBuilder,
  UpdateResult,
} from 'typeorm';
import { ClientContextService } from '../context/client-context.service';
import { ClientScopedEntity } from './client-scoped.entity';

export class ClientRepository<T extends ClientScopedEntity> {
  constructor(protected readonly repo: Repository<T>) {}

  // ✅ Single private owner of clientId — nothing else touches it
  private get clientId(): string {
    return ClientContextService.getClientId();
  }

  private clientWhere(where: FindOptionsWhere<T> = {}): FindOptionsWhere<T> {
    return { ...where, clientId: this.clientId } as FindOptionsWhere<T>;
  }

  // -------------------------
  // READ
  // -------------------------

  find(where: FindOptionsWhere<T> = {}): Promise<T[]> {
    return this.repo.find({ where: this.clientWhere(where) });
  }

  findOne(where: FindOptionsWhere<T>): Promise<T | null> {
    return this.repo.findOne({ where: this.clientWhere(where) });
  }

  findById(id: string): Promise<T | null> {
    return this.repo.findOne({
      where: this.clientWhere({ id } as FindOptionsWhere<T>),
    });
  }

  // -------------------------
  // WRITE
  // -------------------------

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

  // -------------------------
  // QUERY BUILDER
  // Pre-scoped — all complex queries start here
  // -------------------------

  protected qb(alias: string): SelectQueryBuilder<T> {
    return this.repo
      .createQueryBuilder(alias)
      .andWhere(`${alias}.clientId = :clientId`, { clientId: this.clientId });
  }

  // -------------------------
  // ESCAPE HATCH BLOCKED
  // -------------------------

  get unsafe(): never {
    throw new Error(
      'Direct repository access is disabled. Use ClientRepository methods only.',
    );
  }
}

6. Usage in a Feature Module
No ContextModule import. No scope() calls. No manual clientId anywhere.
typescript// modules/topics/topic.repository.ts
@Injectable()
export class TopicRepository extends ClientRepository<Topic> {
  constructor(
    @InjectRepository(Topic)
    repo: Repository<Topic>,
  ) {
    super(repo);
  }

  // Complex query — starts from pre-scoped qb()
  findPaginated(query: PaginationQueryDto): Promise<[Topic[], number]> {
    const { page, limit, search, sortBy, order } = query;

    const builder = this.qb('topic');

    if (search?.trim()) {
      builder.andWhere('topic.title ILIKE :search', {
        search: `%${search.trim()}%`,
      });
    }

    return builder
      .orderBy(`topic.${sortBy}`, order.toUpperCase() as 'ASC' | 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
  }
}
typescript// modules/topics/topics.module.ts
@Module({
  imports: [TypeOrmModule.forFeature([Topic])],
  providers: [TopicsService, TopicRepository],
  controllers: [TopicsController],
  exports: [TopicRepository],
})
export class TopicsModule {}
typescript// modules/topics/topics.service.ts
@Injectable()
export class TopicsService {
  constructor(private readonly topicRepository: TopicRepository) {}

  findAll(): Promise<Topic[]> {
    return this.topicRepository.find();
  }

  findOne(id: string): Promise<Topic | null> {
    return this.topicRepository.findById(id);
  }

  create(dto: CreateTopicDto): Promise<Topic> {
    return this.topicRepository.save(dto);
  }

  update(id: string, dto: UpdateTopicDto): Promise<UpdateResult> {
    return this.topicRepository.update({ id } as any, dto);
  }

  remove(id: string): Promise<UpdateResult> {
    return this.topicRepository.softDelete({ id } as any);
  }
}

What Was Cut and Why
RemovedReasonContextModuleALS needs no DI registrationRequestContext classReplaced by ClientContextService static callClientSubscriberDuplicate INSERT ownership — repo owns itscope() public methodReplaced by private clientWhere() — not bypassableManual clientId in servicesRepo handles it entirely

-->
