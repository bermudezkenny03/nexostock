import { authModule } from '@/modules/auth';
import { dashboardModule } from '@/modules/dashboard';
import { platformModule } from '@/modules/platform';
import { productsModule } from '@/modules/products';
import type { Panel, NavSection } from '@/shared/types/navigation';
import type { AppModule } from '@/shared/types/module';

export const appModules: readonly AppModule[] = [authModule, dashboardModule, productsModule, platformModule];

/** Sections with the same id contributed by several modules are merged. */
export function navigationFor(panel: Panel, modules: readonly AppModule[] = appModules): NavSection[] {
  const sections = new Map<string, NavSection>();
  for (const section of modules.flatMap((module) => module.navigation ?? [])) {
    if (section.panel !== panel) {
      continue;
    }
    const existing = sections.get(section.id);
    if (existing) {
      existing.items.push(...section.items);
    } else {
      sections.set(section.id, { ...section, items: [...section.items] });
    }
  }
  return [...sections.values()].sort((a, b) => a.order - b.order);
}
