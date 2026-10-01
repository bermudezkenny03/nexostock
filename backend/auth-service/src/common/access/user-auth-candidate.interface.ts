import type { AccessUserProfile } from './access-user-profile.interface';

export interface UserAuthCandidate {
  passwordHash: string;
  profile: AccessUserProfile;
}
