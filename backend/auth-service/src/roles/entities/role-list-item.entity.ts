export class RoleListItemEntity {
  id!: string;
  code!: string;
  name!: string;
  description!: string | null;
  isSystem!: boolean;
  permissionCodes!: string[];
}
