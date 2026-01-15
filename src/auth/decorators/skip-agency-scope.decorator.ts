import { SetMetadata } from '@nestjs/common';

export const SKIP_AGENCY_SCOPE_KEY = 'skipAgencyScope';
export const SkipAgencyScope = () => SetMetadata(SKIP_AGENCY_SCOPE_KEY, true);
