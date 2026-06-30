import {
  IsString,
  IsNotEmpty,
  IsArray,
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class FillBlankOptionsDto {
  @ApiProperty({
    example: 'NestJS is a [blank_1] framework built on [blank_2].',
    description: 'Template string with blanks',
  })
  @IsString()
  @IsNotEmpty()
  template!: string; // e.g., "NestJS is a [blank_1] framework built on [blank_2]."
}

export class FillBlankAnswerDto {
  @ApiProperty({
    example: [
      ['Node.js', 'backend'],
      ['TypeScript', 'V8'],
    ],
    description:
      'Answers for each blank. Index 0 corresponds to [blank_1], index 1 to [blank_2].',
  })
  @IsArray()
  @IsArrayOfStringArrays({
    message:
      'answers must be an array of string arrays — one inner array per blank',
  })
  answers!: string[][]; // index 0 = blank_1, index 1 = blank_2
}

function IsArrayOfStringArrays(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isArrayOfStringArrays',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          if (!Array.isArray(value)) return false;
          return value.every(
            (inner) =>
              Array.isArray(inner) &&
              inner.length > 0 &&
              inner.every((s) => typeof s === 'string' && s.trim() !== ''),
          );
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be an array of string arrays e.g. [["answer1", "answer2"], ["answer3"]]`;
        },
      },
    });
  };
}
