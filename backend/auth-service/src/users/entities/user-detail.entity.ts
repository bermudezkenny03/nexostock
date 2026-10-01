export class UserDetailEntity {
  id!: string;
  email!: string;
  businessId!: string;
  isActive!: boolean;
  firstName!: string | null;
  lastName!: string | null;
  phone!: string | null;
  roleIds!: string[];
  roleCodes!: string[];
  createdAt!: Date;
  updatedAt!: Date;
}
