import type { RouteLocationRaw } from 'vue-router';

export type Panel = 'business' | 'platform';

/** Same shape Sakai's AppMenuItem consumes; leaves have `to`, groups have `items` and a unique `path`. */
export interface NavItem {
  label: string;
  icon: string;
  to?: RouteLocationRaw;
  /** Groups only: prefix used by the menu to track which submenu is expanded. */
  path?: string;
  items?: NavItem[];
  /** Any of these permissions shows the item; empty means every user of the panel. */
  permissions?: readonly string[];
  /** Shown but not navigable, e.g. a module whose screens are not built yet. */
  disabled?: boolean;
  badge?: string;
}

export interface NavSection {
  id: string;
  label: string;
  panel: Panel;
  order: number;
  items: NavItem[];
}
