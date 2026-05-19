import { ArgumentMetadata, Injectable, PipeTransform, BadRequestException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';
import { QUESTION_TYPES_CONFIG, QuestionTypeName } from '../../modules/questions/constants/question-types.config';

// Import payload pair structures
import { SingleChoiceSettingsDto, SingleChoiceAnswerDto } from '../../modules/questions/dto/types/single-choice.dto';
import { MultipleChoiceSettingsDto, MultipleChoiceAnswerDto } from '../../modules/questions/dto/types/multiple-choice.dto';
import { TrueFalseSettingsDto, TrueFalseAnswerDto } from '../../modules/questions/dto/types/true-false.dto';
import { OrderingSettingsDto, OrderingAnswerDto } from '../../modules/questions/dto/types/ordering.dto';
import { FillBlankSettingsDto, FillBlankAnswerDto } from '../../modules/questions/dto/types/fill-blank.dto';
import { MatchingSettingsDto, MatchingAnswerDto } from '../../modules/questions/dto/types/matching.dto';
import { RatingSettingsDto, RatingAnswerDto } from '../../modules/questions/dto/types/rating.dto';
import { OpenEndedTextAnswerDto, OpenEndedTextSettingsDto } from '../../modules/questions/dto/types/open-ended-text.dto';

@Injectable()
export class QuestionSchemaValidationPipe implements PipeTransform {
  // Removed DataSource constructor dependency completely!

  async transform(value: any, metadata: ArgumentMetadata) {
    if (metadata.type !== 'body' || !value || !value.type) {
      return value;
    }

    // Direct configuration validation lookup loop
    const config = QUESTION_TYPES_CONFIG[value.type as QuestionTypeName];
    if (!config) {
      throw new BadRequestException(`Invalid type: [${value.type}] is not a recognized configuration type name`);
    }

    const settings = value.options ?? value.settings;
    const correctAnswer = value.correctAnswers ?? value.correctAnswer;

    await this.validateSchemas(value.type, settings, correctAnswer);
    return value;
  }

  private async validateSchemas(typeName: QuestionTypeName, settings: any, correctAnswer: any) {
    if (!settings || typeof settings !== 'object') {
      throw new BadRequestException('options (or settings) must be a valid JSON object');
    }
    if (!correctAnswer || typeof correctAnswer !== 'object') {
      throw new BadRequestException('correctAnswers (or correctAnswer) must be a valid JSON object');
    }

    let settingsClassInstance: any;
    let answerClassInstance: any;

    switch (typeName) {
      case QuestionTypeName.SINGLE_CHOICE:
        settingsClassInstance = plainToInstance(SingleChoiceSettingsDto, settings);
        answerClassInstance = plainToInstance(SingleChoiceAnswerDto, correctAnswer);
        break;

      case QuestionTypeName.MULTIPLE_CHOICE:
        settingsClassInstance = plainToInstance(MultipleChoiceSettingsDto, settings);
        answerClassInstance = plainToInstance(MultipleChoiceAnswerDto, correctAnswer);
        break;

      case QuestionTypeName.TRUE_FALSE:
        settingsClassInstance = plainToInstance(TrueFalseSettingsDto, settings);
        answerClassInstance = plainToInstance(TrueFalseAnswerDto, correctAnswer);
        break;

      case QuestionTypeName.ORDERING:
        settingsClassInstance = plainToInstance(OrderingSettingsDto, settings);
        answerClassInstance = plainToInstance(OrderingAnswerDto, correctAnswer);
        break;

      case QuestionTypeName.FILL_IN_THE_BLANK:
        settingsClassInstance = plainToInstance(FillBlankSettingsDto, settings);
        answerClassInstance = plainToInstance(FillBlankAnswerDto, correctAnswer);
        break;

      case QuestionTypeName.MATCHING:
        settingsClassInstance = plainToInstance(MatchingSettingsDto, settings);
        answerClassInstance = plainToInstance(MatchingAnswerDto, correctAnswer);
        break;

      case QuestionTypeName.RATING:
        settingsClassInstance = plainToInstance(RatingSettingsDto, settings);
        answerClassInstance = plainToInstance(RatingAnswerDto, correctAnswer);
        break;

      case QuestionTypeName.SHORT_ANSWER:
        settingsClassInstance = plainToInstance(OpenEndedTextSettingsDto, settings);
        answerClassInstance = plainToInstance(OpenEndedTextAnswerDto, correctAnswer);
        break;

      case QuestionTypeName.ESSAY:
        settingsClassInstance = plainToInstance(OpenEndedTextSettingsDto, settings);
        answerClassInstance = plainToInstance(OpenEndedTextAnswerDto, correctAnswer);
        break;
    }

    if (settingsClassInstance) {
      const settingsErrors = await validate(settingsClassInstance, { whitelist: true, forbidNonWhitelisted: true });
      if (settingsErrors.length > 0) {
        throw new BadRequestException({
          message: `Validation failed inside settings wrapper for type [${typeName}]`,
          details: this.flattenErrors(settingsErrors),
        });
      }
    }

    if (answerClassInstance) {
      const answerErrors = await validate(answerClassInstance, { whitelist: true, forbidNonWhitelisted: true });
      if (answerErrors.length > 0) {
        throw new BadRequestException({
          message: `Validation failed inside correctAnswer wrapper for type [${typeName}]`,
          details: this.flattenErrors(answerErrors),
        });
      }
    }

    this.executeCrossValidationChecks(typeName, settings, correctAnswer);
  }

  private executeCrossValidationChecks(typeName: QuestionTypeName, settings: any, correctAnswer: any) {
    if (typeName === QuestionTypeName.SINGLE_CHOICE && settings.options && correctAnswer.optionId) {
      const match = settings.options.some((opt: any) => opt.id === correctAnswer.optionId);
      if (!match) throw new BadRequestException('correctAnswer.optionId must match an item inside settings.options');
    }

    if (typeName === QuestionTypeName.MULTIPLE_CHOICE && settings.options && correctAnswer.optionIds) {
      correctAnswer.optionIds.forEach((id: string) => {
        const match = settings.options.some((opt: any) => opt.id === id);
        if (!match) throw new BadRequestException(`correctAnswer identity target [${id}] is missing from settings.options`);
      });
    }
  }

  private flattenErrors(errors: ValidationError[]): string[] {
    const messages: string[] = [];
    for (const error of errors) {
      if (error.constraints) messages.push(...Object.values(error.constraints));
      if (error.children && error.children.length > 0) messages.push(...this.flattenErrors(error.children));
    }
    return messages;
  }
}