import { registerDecorator, ValidationOptions, ValidatorConstraint, ValidatorConstraintInterface, ValidationArguments } from 'class-validator';

@ValidatorConstraint({ name: 'isInPast', async: false })
export class IsInPastConstraint implements ValidatorConstraintInterface {
  validate(value: any, args: ValidationArguments) {
    const date = new Date(value);
    // basic check for invalid date
    if (isNaN(date.getTime())) return false; 
    return date.getTime() <= Date.now();
  }

  defaultMessage(args: ValidationArguments) {
    return 'Date cannot be in the future';
  }
}

export function IsInPast(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsInPastConstraint,
    });
  };
}
