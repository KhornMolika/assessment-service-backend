import { Module } from '@nestjs/common';
import { Assessment } from './entities/assessment.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
    imports: [TypeOrmModule.forFeature([Assessment])],
})
export class AssessmentsModule {}
