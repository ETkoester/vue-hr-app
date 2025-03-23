<template>
  <v-btn class="absolute lg:hidden !mt-[calc(var(--safe-top)+16px)] !ml-[64px] z-[999] ml-2 !fixed" flat @click.stop="drawerOpen = !drawerOpen">
    <v-icon>mdi-menu</v-icon>
    <span>選單</span>
  </v-btn>
  <v-navigation-drawer v-model="drawer" class="!fixed" expand-on-hover width="160" :permanent="windowWidth >= 1024" :rail="windowWidth >= 1024" :temporary="windowWidth < 1024">
    <v-list density="compact">
      <template v-for="item in permissionRouterList" :key="item.path">
        <v-list-group v-if="item.children && item.name != 'chat'">
          <template #activator="{ props }">
            <v-list-item v-bind="props" :title="item.meta?.name" :prepend-icon="item.meta?.icon" />
          </template>
          <v-list-item v-for="child in item.children" :key="compilePath(item.path, child.path)" :title="child.meta?.name" :prepend-icon="child.meta?.icon" :active="child.name === router.currentRoute.value.name" @click="$router.push(child.path)" />
        </v-list-group>
        <v-list-item v-else :title="item.meta?.name" :prepend-icon="item.meta?.icon" :active="item.name === router.currentRoute.value.name" @click="$router.push(item.path)" />
        <v-divider thickness="1" />
      </template>
      <v-list-item title="登出" prepend-icon="mdi-exit-to-app" @click="handleLogout" />
    </v-list>
  </v-navigation-drawer>
</template>

<script lang="ts" setup>
  import { logout } from '@/firebase';
  import router, { permissionRouter } from '@/router';
  import permissionRoutes from '@/router/permission';
  import { useMessageStore } from '@/store/message';
  import { useRoleStore } from '@/store/role';
  import path from 'path';
  import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
  // Get user role
  const roleStore = useRoleStore();
  // Get router list that required permission
  let permissionRouterList = permissionRouter(permissionRoutes(), roleStore.role).filter(function f(item) {
    if (item.children != undefined) {
      item.children = item.children.filter(f);
    }
    if (!item.meta?.hidden) return true;
  });

  // Combine paths
  const compilePath = (itempath: string, childpath: string) => {
    return path.resolve(itempath, childpath);
  };

  const drawerOpen = ref(false);
  const drawer = computed({
    get: () => {
      return drawerOpen.value || windowWidth.value >= 1024;
    },
    set: (value) => {
      drawerOpen.value = value;
    },
  });

  const windowWidth = ref(window.innerWidth);

  onMounted(async () => {
    window.addEventListener('resize', onResize);
  });

  onBeforeUnmount(() => {
    window.removeEventListener('resize', onResize);
  });

  const onResize = () => {
    windowWidth.value = window.innerWidth;
  };

  const messageStore = useMessageStore();
  const handleLogout = async () => {
    await logout()
      .then(() => {
        messageStore.showMessage('登出成功！');
      })
      .catch((err) => {
        console.error(err);
      });
  };
</script>

<style scoped>
  .v-list-group__items .v-list-item {
    padding-inline-start: 16px !important;
  }

  :deep(.v-list-item__append) {
    display: block;
  }
</style>
