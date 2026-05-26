// question-schema-validation.pipe.ts
import {
  ArgumentMetadata,
  Injectable,
  PipeTransform,
  BadRequestException,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';
import {
  QUESTION_TYPES_CONFIG,
  QuestionTypeName,
} from '../../modules/questions/constants/question-types.config';

import {
  SingleChoiceOptionsDto,
  SingleChoiceAnswerDto,
} from '../../modules/questions/dto/types/single-choice.dto';
import {
  MultipleChoiceOptionsDto,
  MultipleChoiceAnswerDto,
} from '../../modules/questions/dto/types/multiple-choice.dto';
import {
  TrueFalseOptionsDto,
  TrueFalseAnswerDto,
} from '../../modules/questions/dto/types/true-false.dto';
import {
  OrderingOptionsDto,
  OrderingAnswerDto,
} from '../../modules/questions/dto/types/ordering.dto';
import {
  FillBlankOptionsDto,
  FillBlankAnswerDto,
} from '../../modules/questions/dto/types/fill-blank.dto';
import {
  MatchingOptionsDto,
  MatchingAnswerDto,
} from '../../modules/questions/dto/types/matching.dto';
import { RatingOptionsDto } from '../../modules/questions/dto/types/rating.dto';
import {
  OpenEndedTextOptionsDto,
  OpenEndedTextAnswerDto,
} from '../../modules/questions/dto/types/open-ended-text.dto';

@Injectable()
export class QuestionSchemaValidationPipe implements PipeTransform {
  async transform(value: any, metadata: ArgumentMetadata) {
    if (metadata.type !== 'body' || !value || !value.type) {
      return value;
    }

    const config = QUESTION_TYPES_CONFIG[value.type as QuestionTypeName];
    if (!config) {
      throw new BadRequestException(
        `Invalid type: [${value.type}] is not a recognized question type`,
      );
    }

    const rawOptions = value.options ?? value.settings;
    const correctAnswer = value.correctAnswers ?? value.correctAnswer;

    // RATING has no correct answer — skip correctAnswer validation entirely
    if (value.type === QuestionTypeName.RATING) {
      await this.validateRatingOptions(rawOptions);
      return value;
    }

    if (correctAnswer === undefined || correctAnswer === null) {
      throw new BadRequestException('correctAnswers must be provided');
    }

    await this.validateSchemas(value.type, rawOptions, correctAnswer);
    return value;
  }

  private async validateRatingOptions(rawOptions: any) {
    if (
      !rawOptions ||
      typeof rawOptions !== 'object' ||
      Array.isArray(rawOptions)
    ) {
      throw new BadRequestException('options must be an object for RATING');
    }

    const instance = plainToInstance(RatingOptionsDto, rawOptions);
    const errors = await validate(instance, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    if (errors.length > 0) {
      throw new BadRequestException({
        message: 'Validation failed for options in type [RATING]',
        details: this.flattenErrors(errors),
      });
    }

    if (instance.min >= instance.max) {
      throw new BadRequestException(
        'options.min must be less than options.max',
      );
    }
  }

  private async validateSchemas(
    typeName: QuestionTypeName,
    rawOptions: any,
    correctAnswer: any,
  ) {
    if (correctAnswer === undefined || correctAnswer === null) {
      throw new BadRequestException(
        'correctAnswers (or correctAnswer) must be provided',
      );
    }

    let optionsInstance: any;
    let answerInstance: any;

    switch (typeName) {
      // --- Array-based types (options sent as flat array) ---

      case QuestionTypeName.SINGLE_CHOICE:
        if (!Array.isArray(rawOptions)) {
          throw new BadRequestException(
            'options must be an array for SINGLE_CHOICE',
          );
        }
        optionsInstance = plainToInstance(SingleChoiceOptionsDto, {
          options: rawOptions,
        });
        answerInstance = plainToInstance(SingleChoiceAnswerDto, correctAnswer);
        break;

      case QuestionTypeName.MULTIPLE_CHOICE:
        if (!Array.isArray(rawOptions)) {
          throw new BadRequestException(
            'options must be an array for MULTIPLE_CHOICE',
          );
        }
        optionsInstance = plainToInstance(MultipleChoiceOptionsDto, {
          options: rawOptions,
        });
        answerInstance = plainToInstance(
          MultipleChoiceAnswerDto,
          correctAnswer,
        );
        break;

      case QuestionTypeName.ORDERING:
        if (!Array.isArray(rawOptions)) {
          throw new BadRequestException(
            'options must be an array for ORDERING',
          );
        }
        optionsInstance = plainToInstance(OrderingOptionsDto, {
          items: rawOptions,
        });
        answerInstance = plainToInstance(OrderingAnswerDto, correctAnswer);
        break;

      // --- Object-based types (options sent as object) ---

      case QuestionTypeName.TRUE_FALSE:
        if (
          !rawOptions ||
          typeof rawOptions !== 'object' ||
          Array.isArray(rawOptions)
        ) {
          throw new BadRequestException(
            'options must be an object for TRUE_FALSE',
          );
        }
        optionsInstance = plainToInstance(TrueFalseOptionsDto, rawOptions);
        answerInstance = plainToInstance(TrueFalseAnswerDto, correctAnswer);
        break;

      case QuestionTypeName.FILL_IN_THE_BLANK:
        if (
          !rawOptions ||
          typeof rawOptions !== 'object' ||
          Array.isArray(rawOptions)
        ) {
          throw new BadRequestException(
            'options must be an object for FILL_IN_THE_BLANK',
          );
        }
        optionsInstance = plainToInstance(FillBlankOptionsDto, rawOptions);
        answerInstance = plainToInstance(FillBlankAnswerDto, correctAnswer);
        break;

      case QuestionTypeName.MATCHING:
        if (
          !rawOptions ||
          typeof rawOptions !== 'object' ||
          Array.isArray(rawOptions)
        ) {
          throw new BadRequestException(
            'options must be an object for MATCHING',
          );
        }
        optionsInstance = plainToInstance(MatchingOptionsDto, rawOptions);
        answerInstance = plainToInstance(MatchingAnswerDto, correctAnswer);
        break;

      case QuestionTypeName.RATING:
        if (
          !rawOptions ||
          typeof rawOptions !== 'object' ||
          Array.isArray(rawOptions)
        ) {
          throw new BadRequestException('options must be an object for RATING');
        }
        optionsInstance = plainToInstance(RatingOptionsDto, rawOptions);
        answerInstance = null;
        break;

      case QuestionTypeName.SHORT_ANSWER:
      case QuestionTypeName.ESSAY:
        if (
          !rawOptions ||
          typeof rawOptions !== 'object' ||
          Array.isArray(rawOptions)
        ) {
          throw new BadRequestException(
            'options must be an object for open-ended types',
          );
        }
        optionsInstance = plainToInstance(OpenEndedTextOptionsDto, rawOptions);
        answerInstance = plainToInstance(OpenEndedTextAnswerDto, correctAnswer);
        break;
    }

    if (optionsInstance) {
      const optionsErrors = await validate(optionsInstance, {
        whitelist: true,
        forbidNonWhitelisted: true,
      });
      if (optionsErrors.length > 0) {
        throw new BadRequestException({
          message: `Validation failed for options in type [${typeName}]`,
          details: this.flattenErrors(optionsErrors),
        });
      }
    }

    if (answerInstance) {
      const answerErrors = await validate(answerInstance, {
        whitelist: true,
        forbidNonWhitelisted: true,
      });
      if (answerErrors.length > 0) {
        throw new BadRequestException({
          message: `Validation failed for correctAnswers in type [${typeName}]`,
          details: this.flattenErrors(answerErrors),
        });
      }
    }

    this.crossValidate(typeName, rawOptions, correctAnswer);
  }

  private crossValidate(
    typeName: QuestionTypeName,
    rawOptions: any,
    correctAnswer: any,
  ): void {
    // For array-based types, rawOptions IS the array
    // For object-based types, rawOptions is the object

    if (typeName === QuestionTypeName.SINGLE_CHOICE) {
      const match = (rawOptions as any[]).some(
        (opt) => opt.id === correctAnswer.optionId,
      );
      if (!match) {
        throw new BadRequestException(
          'correctAnswers.optionId must match an id in options',
        );
      }
    }

    if (typeName === QuestionTypeName.MULTIPLE_CHOICE) {
      (correctAnswer.optionIds as string[]).forEach((id) => {
        const match = (rawOptions as any[]).some((opt) => opt.id === id);
        if (!match) {
          throw new BadRequestException(
            `correctAnswers.optionIds contains [${id}] which is not in options`,
          );
        }
      });
    }

    if (typeName === QuestionTypeName.ORDERING) {
      const itemIds = (rawOptions as any[]).map((item) => item.id);
      (correctAnswer.sequence as string[]).forEach((id) => {
        if (!itemIds.includes(id)) {
          throw new BadRequestException(
            `correctAnswers.sequence contains [${id}] which is not in options`,
          );
        }
      });
    }

    if (typeName === QuestionTypeName.MATCHING) {
      const leftIds = rawOptions.leftSide.map((item: any) => item.id);
      const rightIds = rawOptions.rightSide.map((item: any) => item.id);
      (correctAnswer.pairs as any[]).forEach((pair) => {
        if (!leftIds.includes(pair.leftId)) {
          throw new BadRequestException(
            `correctAnswers pair leftId [${pair.leftId}] not found in options.leftSide`,
          );
        }
        if (!rightIds.includes(pair.rightId)) {
          throw new BadRequestException(
            `correctAnswers pair rightId [${pair.rightId}] not found in options.rightSide`,
          );
        }
      });
    }

    if (typeName === QuestionTypeName.FILL_IN_THE_BLANK) {
      const template = rawOptions.template as string;
      const blankCount = (template.match(/\[blank_\d+\]/g) ?? []).length;
      const answerCount = (correctAnswer.answers as string[][]).length;

      if (answerCount !== blankCount) {
        throw new BadRequestException(
          `correctAnswers.answers has ${answerCount} entry(s) but template has ${blankCount} blank(s). They must match.`,
        );
      }
    }
  }

  private flattenErrors(errors: ValidationError[]): string[] {
    const messages: string[] = [];
    for (const error of errors) {
      if (error.constraints) {
        messages.push(...Object.values(error.constraints));
      }
      if (error.children && error.children.length > 0) {
        messages.push(...this.flattenErrors(error.children));
      }
    }
    return messages;
  }
}
