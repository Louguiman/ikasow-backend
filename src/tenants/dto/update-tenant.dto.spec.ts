import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateTenantDto } from './update-tenant.dto';
import { CreateTenantDto } from './create-tenant.dto';

/**
 * `TenantsService.update` ends in `Object.assign(tenant, updateTenantDto)`, so
 * whatever this DTO allows is written straight onto the row. These specs pin the
 * boundary using the same options the global ValidationPipe runs with
 * (`whitelist: true, forbidNonWhitelisted: true`, see main.ts), so a field
 * re-added to the parent DTO cannot quietly reappear on the update path.
 */
const VALIDATE_OPTIONS = { whitelist: true, forbidNonWhitelisted: true };

describe('UpdateTenantDto', () => {
  const propertyErrors = async (
    body: Record<string, unknown>,
  ): Promise<string[]> => {
    const dto = plainToInstance(UpdateTenantDto, body);
    return (await validate(dto, VALIDATE_OPTIONS)).map((e) => e.property);
  };

  it('accepts the ordinary editable fields', async () => {
    expect(
      await propertyErrors({ firstName: 'Jane', status: 'active' }),
    ).toHaveLength(0);
  });

  it('still accepts userId, so an admin can link a tenant to their account', async () => {
    expect(
      await propertyErrors({ userId: '123e4567-e89b-12d3-a456-426614174001' }),
    ).toHaveLength(0);
  });

  it('rejects agencyId, so a staff user cannot move a tenant into another agency', async () => {
    // `create` overwrites agencyId from the request context, but `update` used to
    // take it from the body: because the DTO inherited the field, a PATCH could
    // carry a tenant row into another agency.
    expect(
      await propertyErrors({
        agencyId: '123e4567-e89b-12d3-a456-426614174000',
      }),
    ).toContain('agencyId');
  });

  it('does not resurrect the dropped lease columns', async () => {
    expect(
      await propertyErrors({
        monthlyRent: 1000,
        leaseStartDate: '2026-01-01',
      }),
    ).toEqual(expect.arrayContaining(['monthlyRent', 'leaseStartDate']));
  });

  it('still offers agencyId on create, which the controller overwrites', () => {
    // The separation is deliberate: create keeps the field so the controller has
    // something to overwrite, update does not accept it at all.
    const createDto = plainToInstance(CreateTenantDto, {
      agencyId: '123e4567-e89b-12d3-a456-426614174000',
    });
    expect('agencyId' in createDto).toBe(true);
  });
});
