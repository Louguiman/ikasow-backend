import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

/**
 * Validator constraint for checking if a date is before another date field
 */
@ValidatorConstraint({ name: 'isDateBefore', async: false })
export class IsDateBeforeConstraint implements ValidatorConstraintInterface {
  validate(value: any, args: ValidationArguments): boolean {
    if (!value) {
      return true; // Let @IsNotEmpty handle required validation
    }

    const [relatedPropertyName] = args.constraints;
    const relatedValue = (args.object as any)[relatedPropertyName];

    if (!relatedValue) {
      return true; // Can't compare if the other date doesn't exist yet
    }

    const date1 = new Date(value);
    const date2 = new Date(relatedValue);

    // Check if dates are valid
    if (isNaN(date1.getTime()) || isNaN(date2.getTime())) {
      return false;
    }

    return date1 < date2;
  }

  defaultMessage(args: ValidationArguments): string {
    const [relatedPropertyName] = args.constraints;
    return `${args.property} must be before ${relatedPropertyName}`;
  }
}

/**
 * Validator constraint for checking if a date is after another date field
 */
@ValidatorConstraint({ name: 'isDateAfter', async: false })
export class IsDateAfterConstraint implements ValidatorConstraintInterface {
  validate(value: any, args: ValidationArguments): boolean {
    if (!value) {
      return true; // Let @IsNotEmpty handle required validation
    }

    const [relatedPropertyName] = args.constraints;
    const relatedValue = (args.object as any)[relatedPropertyName];

    if (!relatedValue) {
      return true; // Can't compare if the other date doesn't exist yet
    }

    const date1 = new Date(value);
    const date2 = new Date(relatedValue);

    // Check if dates are valid
    if (isNaN(date1.getTime()) || isNaN(date2.getTime())) {
      return false;
    }

    return date1 > date2;
  }

  defaultMessage(args: ValidationArguments): string {
    const [relatedPropertyName] = args.constraints;
    return `${args.property} must be after ${relatedPropertyName}`;
  }
}

/**
 * Decorator to validate that a date field is before another date field
 * @param property - The name of the property to compare against
 * @param validationOptions - Additional validation options
 * @example
 * class CreateLeaseDto {
 *   @IsDateBefore('leaseEndDate')
 *   leaseStartDate: Date;
 *
 *   leaseEndDate: Date;
 * }
 */
export function IsDateBefore(
  property: string,
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [property],
      validator: IsDateBeforeConstraint,
    });
  };
}

/**
 * Decorator to validate that a date field is after another date field
 * @param property - The name of the property to compare against
 * @param validationOptions - Additional validation options
 * @example
 * class CreateLeaseDto {
 *   leaseStartDate: Date;
 *
 *   @IsDateAfter('leaseStartDate')
 *   leaseEndDate: Date;
 * }
 */
export function IsDateAfter(
  property: string,
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [property],
      validator: IsDateAfterConstraint,
    });
  };
}
