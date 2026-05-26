import {
  IsString,
  IsNotEmpty,
  IsArray,
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

export class FillBlankOptionsDto {
  @IsString()
  @IsNotEmpty()
  template!: string; // e.g., "NestJS is a [blank_1] framework built on [blank_2]."
}

export class FillBlankAnswerDto {
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
        validate(value: any) {
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
