export class ModuleTreeNodeEntity {
  id!: string;
  code!: string;
  name!: string;
  description!: string | null;
  sortOrder!: number;
  route!: string | null;
  icon!: string | null;
  children!: ModuleTreeNodeEntity[];
}
