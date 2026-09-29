import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateClientDto } from './update-client.dto';
import { CreateClientDto } from './create-client.dto';

/**
 * `ClientsService.update` ends in `BaseService.baseUpdate` →
 * `repository.update(id, data)`, so whatever this DTO allows is written straight
 * onto the row. `agencyId` used to be inherited from `CreateClientDto`, which
 * made a cross-tenant move reachable with a single authenticated PATCH; these
 * specs pin the boundary with the same options the global ValidationPipe runs
 * with (`whitelist: true, forbidNonWhitelisted: true`, see main.ts).
 */
const VALIDATE_OPTIONS = { whitelist: true, forbidNonWhitelisted: true };

const AGENCY_B = '22222222-2222-4222-8222-222222222222';

describe('UpdateClientDto', () => {
  const propertyErrors = async (
    body: Record<string, unknown>,
  ): Promise<string[]> => {
    const dto = plainToInstance(UpdateClientDto, body);
    return (await validate(dto, VALIDATE_OPTIONS)).map((e) => e.property);
  };

  it('accepts the ordinary editable fields', async () => {
    expect(
      await propertyErrors({
        firstName: 'Marie',
        status: 'active',
        notes: 'VIP',
      }),
    ).toHaveLength(0);
  });

  it('rejects agencyId, so a staff user cannot move a client into another agency', async () => {
    // A UUID is not a defence — `@IsUUID()` passed the attacker's own agency id
    // straight through. The field has to be absent for the request to be refused.
    expect(await propertyErrors({ agencyId: AGENCY_B })).toContain('agencyId');
  });

  it('rejects agencyId even when bundled with legitimate fields', async () => {
    expect(
      await propertyErrors({ firstName: 'Marie', agencyId: AGENCY_B }),
    ).toContain('agencyId');
  });

  it('still accepts userId, so an admin can link a client to their account', async () => {
    // That link is what the CLIENT self-service check in findOne compares against.
    expect(
      await propertyErrors({ userId: '123e4567-e89b-42d3-a456-426614174001' }),
    ).toHaveLength(0);
  });

  it('still offers agencyId on create, which the controller overwrites', () => {
    // The separation is deliberate: create keeps the field so the controller has
    // something to overwrite, update does not accept it at all.
    const createDto = plainToInstance(CreateClientDto, { agencyId: AGENCY_B });
    expect('agencyId' in createDto).toBe(true);
  });
});
