import type { RouteLocationRaw } from 'vue-router';

export type Panel = 'business' | 'platform';

export interface NavItem {
  label: string;
  icon: string;
  to: RouteLocationRaw;
  /** Any of these permissions shows the item; empty means every user of the panel. */
  permissions?: readonly string[];
}

export interface NavSection {
  id: string;
  label: string;
  panel: Panel;
  order: number;
  items: NavItem[];
}
