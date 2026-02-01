import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'isInPast', async: false })
export class IsInPastConstraint implements ValidatorConstraintInterface {
  validate(value: any) {
    const date = new Date(value as string | number | Date);
    // basic check for invalid date
    if (isNaN(date.getTime())) return false;
    return date.getTime() <= Date.now();
  }

  defaultMessage() {
    return 'Date cannot be in the future';
  }
}

export function IsInPast(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsInPastConstraint,
    });
  };
}
