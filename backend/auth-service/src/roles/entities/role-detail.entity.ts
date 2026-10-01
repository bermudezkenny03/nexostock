export class RoleDetailEntity {
  id!: string;
  businessId!: string;
  code!: string;
  name!: string;
  description!: string | null;
  isSystem!: boolean;
  permissionIds!: string[];
  permissionCodes!: string[];
  createdAt!: Date;
  updatedAt!: Date;
}
