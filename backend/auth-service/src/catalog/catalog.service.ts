import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  ModuleTreeNodeEntity,
  PermissionCatalogItemEntity,
} from './entities';

type ModuleRow = {
  id: string;
  parentId: string | null;
  code: string;
  name: string;
  description: string | null;
  sortOrder: number;
  route: string | null;
  icon: string | null;
};

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  async getModuleTree(): Promise<ModuleTreeNodeEntity[]> {
    const modules = await this.prisma.module.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    return this.buildModuleTree(modules);
  }

  async getPermissions(): Promise<PermissionCatalogItemEntity[]> {
    const permissions = await this.prisma.permission.findMany({
      include: { module: true },
      orderBy: [{ module: { sortOrder: 'asc' } }, { code: 'asc' }],
    });

    return permissions.map((p) => ({
      id: p.id,
      code: p.code,
      name: p.name,
      action: p.action,
      moduleId: p.moduleId,
      moduleCode: p.module.code,
    }));
  }

  private buildModuleTree(modules: ModuleRow[]): ModuleTreeNodeEntity[] {
    const byParent = new Map<string | null, ModuleRow[]>();
    for (const mod of modules) {
      const key = mod.parentId;
      const list = byParent.get(key) ?? [];
      list.push(mod);
      byParent.set(key, list);
    }

    const visit = (parentId: string | null): ModuleTreeNodeEntity[] => {
      const siblings = byParent.get(parentId) ?? [];
      return siblings.map((mod) => ({
        id: mod.id,
        code: mod.code,
        name: mod.name,
        description: mod.description,
        sortOrder: mod.sortOrder,
        route: mod.route,
        icon: mod.icon,
        children: visit(mod.id),
      }));
    };

    return visit(null);
  }
}
