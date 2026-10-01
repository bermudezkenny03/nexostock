export class RoleListItemEntity {
  id!: string;
  businessId!: string;
  code!: string;
  name!: string;
  description!: string | null;
  isSystem!: boolean;
  permissionCodes!: string[];
}
