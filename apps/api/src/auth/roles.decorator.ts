import { SetMetadata } from '@nestjs/common';
import type { Role } from '@carpool/shared';

export const ROLES_KEY = 'roles';
/** Użycie: @Roles('DRIVER') nad endpointem — dostęp tylko dla kierowców */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
