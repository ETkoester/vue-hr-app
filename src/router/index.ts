// Composables
import { useLocalStorage } from '@vueuse/core';
import 'vue-router';
import { RouteRecordRaw, createRouter, createWebHashHistory } from 'vue-router';
import permissionRoutes from './permission';

declare module 'vue-router' {
  interface RouteMeta {
    role: string[];
    name?: string;
    icon?: string;
    hidden?: boolean;
  }
}

const routes = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/LoginPage.vue'),
    meta: {
      role: ['user', 'admin'],
      hidden: true,
    },
  },
];

const router = createRouter({
  history: createWebHashHistory(process.env.BASE_URL),
  routes,
});

export const resetRouter = () => {
  router.getRoutes().forEach((route) => {
    router.removeRoute(route.name ?? '');
  });
  routes.forEach((route) => {
    router.addRoute(route);
  });
};

const role = useLocalStorage('role', '');

export const permissionRouter = (router: Array<RouteRecordRaw>, role: string) => {
  return router.filter((item) => {
    if (item.children) {
      item.children = permissionRouter(item.children, role);
    }
    return item.meta?.role?.includes(role);
  });
};

router.beforeEach((to, from, next) => {
  if (to.name != undefined && router.hasRoute(to.name)) {
    next();
  } else {
    const permissionRouteList = permissionRouter(permissionRoutes(), role.value);
    permissionRouteList.forEach((route) => router.addRoute(route));

    if (permissionRouteList.length <= 0) {
      const available = router.getRoutes()[0];
      next({ ...available, replace: true });
    }

    next({ ...to, replace: true });
  }
});

export default router;
