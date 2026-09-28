import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateProfileDto } from './update-profile.dto';
import { UpdateUserDto } from './update-user.dto';

/**
 * The profile route is guarded by the DTO alone: `UsersService.update` ends in
 * `Object.assign(user, updateUserDto)`, so whatever the DTO allows is written
 * straight onto the row. These specs pin the DTO boundary using the same options
 * the global ValidationPipe runs with (`whitelist: true, forbidNonWhitelisted: true`,
 * see main.ts), so a field added to the admin DTO cannot quietly reappear on the
 * self-service path.
 */
const VALIDATE_OPTIONS = { whitelist: true, forbidNonWhitelisted: true };

describe('UpdateProfileDto', () => {
  const validationErrorsFor = async (body: Record<string, unknown>) => {
    const dto = plainToInstance(UpdateProfileDto, body);
    return validate(dto, VALIDATE_OPTIONS);
  };

  const propertyErrors = async (body: Record<string, unknown>) =>
    (await validationErrorsFor(body)).map((error) => error.property);

  it('accepts the self-service fields', async () => {
    const errors = await validationErrorsFor({
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      password: 'newpassword123',
    });

    expect(errors).toHaveLength(0);
  });

  it('rejects role, so a user cannot promote themselves', async () => {
    expect(await propertyErrors({ firstName: 'John', role: 'platform-admin' })).toContain(
      'role',
    );
  });

  it('rejects agencyId, so a user cannot move into another tenant', async () => {
    expect(
      await propertyErrors({ firstName: 'John', agencyId: '123e4567-e89b-12d3-a456-426614174000' }),
    ).toContain('agencyId');
  });

  it('rejects isActive, so a user cannot un-deactivate their own account', async () => {
    expect(await propertyErrors({ isActive: false })).toContain('isActive');
  });
});

describe('UpdateUserDto (agency-admin path)', () => {
  it('still carries role and agencyId, which is what the admin route needs', () => {
    // The separation is the point: the same fields stay available to the
    // role-guarded PATCH /users/:id route, just not to the profile route.
    const dto = plainToInstance(UpdateUserDto, {
      role: 'agent',
      agencyId: '123e4567-e89b-12d3-a456-426614174000',
    });

    expect(dto.role).toBe('agent');
    expect(dto.agencyId).toBe('123e4567-e89b-12d3-a456-426614174000');
  });
});
