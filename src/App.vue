<template>
  <v-app>
    <v-layout class="rounded rounded-md">
      <v-app-bar v-if="$route.path != '/login'" class="!shadow !fixed" :height="safeTop" flat color="green-darken-4" />
      <v-app-bar v-if="$route.path != '/login'" class="!shadow !fixed">
        <TopBar />
      </v-app-bar>

      <SideNav v-if="$route.path != '/login'" />

      <v-main class="d-flex align-center justify-center max-md:pl-0 md:pb-0" style="min-height: 300px">
        <RouterView />
      </v-main>
    </v-layout>
    <v-overlay v-model="loadingStore.isLoading" class="loading" scrim="#000000" persistent>
      <div class="flex !justify-center items-center h-full">
        <v-progress-circular indeterminate size="80">
          <b>載入中...</b>
        </v-progress-circular>
      </div>
    </v-overlay>
    <v-snackbar v-model="messageStore.showStatus" location="top" rounded="pill" :color="messageStore.color" min-width="50" timeout="1500">
      <v-icon>{{ `mdi-${messageStore.icon}` }}</v-icon>
      {{ messageStore.text }}
    </v-snackbar>
  </v-app>
</template>

<script setup lang="ts">
  import SideNav from '@/components/SideNav.vue';
  import TopBar from '@/components/TopBar.vue';
  import { Capacitor } from '@capacitor/core';
  import { SafeArea } from 'capacitor-plugin-safe-area';
  import { onMounted, ref, watchEffect } from 'vue';
  import { auth, getUserRole } from './firebase';
  import router from './router';
  import { useLoadingStore } from './store/loading';
  import { useMessageStore } from './store/message';
  import { useRoleStore } from './store/role';

  const roleStore = useRoleStore();
  const loadingStore = useLoadingStore();
  const messageStore = useMessageStore();

  const safeTop = ref(0);

  watchEffect(() => {
    // Watching the auth state of current user. Return to login page if signed out.
    auth.onAuthStateChanged(async (user) => {
      if (user) {
        roleStore.login(user.uid);
        const role = await getUserRole(user.uid);
        if (role != null) {
          roleStore.setRole(role);
        }
      } else {
        roleStore.logout();
        router.replace('/login');
      }
    });
  });

  onMounted(async () => {
    if (Capacitor.getPlatform() == 'ios') {
      const statusBarInfo = await SafeArea.getStatusBarHeight();
      safeTop.value = statusBarInfo.statusBarHeight;
      document.documentElement.style.setProperty('--safe-top', `${safeTop.value}px`);
    }
  });
</script>
