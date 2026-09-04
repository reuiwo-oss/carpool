import type { ParticipantRole } from '@carpool/shared';

/**
 * Odznaki ról. Kolejność ról ustala `deriveParticipantRoles` w shared, więc
 * tutaj tylko je nazywamy — nic nie sortujemy po raz drugi.
 */
export const ROLE_LABEL: Record<ParticipantRole, string> = {
  ORGANIZER: 'Organizator',
  DRIVER: 'Kierowca',
  PASSENGER: 'Pasażer',
  LOOKING_FOR_SEAT: 'Szuka miejsca',
};

/** Rola wiodąca dostaje akcent, reszta jest cicha — inaczej karta krzyczy. */
const ROLE_TAG: Record<ParticipantRole, string> = {
  ORGANIZER: 'tag-accent',
  DRIVER: 'tag-accent',
  PASSENGER: 'tag-neutral',
  LOOKING_FOR_SEAT: 'tag-outline',
};

export function RoleBadges({ roles, size = 11 }: { roles: ParticipantRole[]; size?: number }) {
  if (roles.length === 0) return null;
  return (
    <span style={{ display: 'inline-flex', gap: 4, flexWrap: 'wrap' }}>
      {roles.map((role) => (
        <span key={role} className={`tag ${ROLE_TAG[role]}`} style={{ fontSize: size }}>
          {ROLE_LABEL[role]}
        </span>
      ))}
    </span>
  );
}
