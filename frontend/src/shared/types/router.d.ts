import 'vue-router';

export {};

declare module 'vue-router' {
  interface RouteMeta {
    /** Routes reachable without a session (login). */
    public?: boolean;
    /** Public routes that an authenticated user should not see. */
    guestOnly?: boolean;
    /** Restricts the route to one panel; omitted means both panels. */
    panel?: 'business' | 'platform';
    /** Any of these permissions grants access (same OR semantics as the backend). */
    permissions?: readonly string[];
    title?: string;
  }
}
