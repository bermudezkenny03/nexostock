import { Icon } from '@/shared/constants/icons';
import { Permission } from '@/shared/constants/permissions';
import type { AppModule } from '@/shared/types/module';

export { userKeys, roleKeys, useUserList, useRoles } from './composables/useUsers';
export type { UserListItem, RoleListItem } from './types';

export const usersModule: AppModule = {
  id: 'users',
  shellRoutes: [
    {
      path: '/app/users',
      name: 'users',
      component: () => import('./pages/UsersPage.vue'),
      meta: { panel: 'business', permissions: [Permission.USERS_MANAGE], title: 'Usuarios' },
    },
    {
      path: '/app/roles',
      name: 'roles',
      component: () => import('./pages/RolesPage.vue'),
      meta: { panel: 'business', permissions: [Permission.ROLES_MANAGE], title: 'Roles' },
    },
  ],
  navigation: [
    {
      id: 'admin',
      label: 'Administración',
      panel: 'business',
      order: 50,
      items: [
        { label: 'Usuarios', icon: Icon.users, to: { name: 'users' }, permissions: [Permission.USERS_MANAGE] },
        { label: 'Roles', icon: Icon.roles, to: { name: 'roles' }, permissions: [Permission.ROLES_MANAGE] },
      ],
    },
  ],
};
