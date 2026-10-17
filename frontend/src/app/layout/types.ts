import type { RouteLocationRaw } from 'vue-router';

/** Menu model used by the Sakai AppMenu / AppMenuItem pair. */
export interface SakaiMenuItem {
  label: string;
  icon?: string;
  to?: RouteLocationRaw;
  url?: string;
  target?: string;
  path?: string;
  class?: string;
  items?: SakaiMenuItem[];
  separator?: boolean;
  visible?: boolean;
  disabled?: boolean;
  command?: (event: { originalEvent: Event; item: SakaiMenuItem }) => void;
}
