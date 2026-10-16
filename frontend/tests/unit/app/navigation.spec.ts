import { describe, expect, it } from 'vitest';
import { navigationFor } from '@/app/modules';
import type { AppModule } from '@/shared/types/module';

const modules: AppModule[] = [
  {
    id: 'a',
    navigation: [{ id: 'catalog', label: 'Catálogo', panel: 'business', order: 10, items: [{ label: 'A', icon: '', to: '/a' }] }],
  },
  {
    id: 'b',
    navigation: [
      { id: 'catalog', label: 'Catálogo', panel: 'business', order: 10, items: [{ label: 'B', icon: '', to: '/b' }] },
      { id: 'general', label: 'General', panel: 'business', order: 0, items: [{ label: 'Inicio', icon: '', to: '/' }] },
      { id: 'platform', label: 'Plataforma', panel: 'platform', order: 0, items: [{ label: 'P', icon: '', to: '/p' }] },
    ],
  },
];

describe('navigationFor', () => {
  it('merges sections by id, sorts them and filters by panel', () => {
    const sections = navigationFor('business', modules);

    expect(sections.map((section) => section.id)).toEqual(['general', 'catalog']);
    expect(sections[1]?.items.map((item) => item.label)).toEqual(['A', 'B']);
  });

  it('does not mutate the module definitions', () => {
    navigationFor('business', modules);

    expect(modules[0]?.navigation?.[0]?.items).toHaveLength(1);
  });
});
