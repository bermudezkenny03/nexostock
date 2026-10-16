import type { RouteRecordRaw } from 'vue-router';
import type { NavSection } from './navigation';

/** Public contract each feature module exposes to the app shell. */
export interface AppModule {
  id: string;
  /** Rendered inside the authenticated shell (sidebar + topbar). */
  shellRoutes?: RouteRecordRaw[];
  /** Rendered inside the public auth layout. */
  publicRoutes?: RouteRecordRaw[];
  navigation?: NavSection[];
}
