import { Injectable } from '@nestjs/common';
import {
  isPlatformBusiness,
  permissionsAllowedByPlan,
} from '../common/rbac/permission.constants';
import { PrismaService } from '../prisma/prisma.service';
import { ModuleTreeNodeEntity, PermissionCatalogItemEntity } from './entities';

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

  async getModuleTree(businessId: string): Promise<ModuleTreeNodeEntity[]> {
    const modules = await this.prisma.module.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    const allowed = await this.allowedPermissionCodes(businessId);
    if (allowed === null) {
      return this.buildModuleTree(modules);
    }

    const permissions = await this.prisma.permission.findMany({
      where: { code: { in: [...allowed] } },
      select: { moduleId: true },
    });

    const parentOf = new Map(modules.map((m) => [m.id, m.parentId]));
    const visible = new Set<string>();
    for (const { moduleId } of permissions) {
      let current: string | null | undefined = moduleId;
      while (current && !visible.has(current)) {
        visible.add(current);
        current = parentOf.get(current);
      }
    }

    return this.buildModuleTree(modules.filter((m) => visible.has(m.id)));
  }

  async getPermissions(
    businessId: string,
  ): Promise<PermissionCatalogItemEntity[]> {
    const allowed = await this.allowedPermissionCodes(businessId);
    const permissions = await this.prisma.permission.findMany({
      where: allowed === null ? undefined : { code: { in: [...allowed] } },
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

  private async allowedPermissionCodes(
    businessId: string,
  ): Promise<readonly string[] | null> {
    if (isPlatformBusiness(businessId)) {
      return null;
    }
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: { planCode: true },
    });
    return permissionsAllowedByPlan(business?.planCode ?? '');
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
