export class UserListItemEntity {
  id!: string;
  email!: string;
  isActive!: boolean;
  firstName!: string | null;
  lastName!: string | null;
  roleIds!: string[];
  roleCodes!: string[];
}
