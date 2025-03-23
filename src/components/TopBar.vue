<template>
  <v-container fluid class="!p-0 h-full flex !m-0">
    <v-img max-width="64" max-heigth="64" class="w-full" :src="logoStore.url || logoUrl!" style="cursor: pointer" @click="router.push({ path: 'home' })" />
    <div class="hidden sm:flex items-center ml-5 sm:max-lg:pl-14">
      <h1>{{ info == undefined ? '' : info.name }}</h1>
    </div>
    <v-spacer />
    <div class="flex items-center">
      <v-switch v-model="darkMode" inset hide-details true-icon="mdi-weather-night" false-icon="mdi-white-balance-sunny" class="mr-2" @click="toggleTheme" />
      <v-divider v-if="roleStore.role == 'admin'" inset vertical thickness="1" />
      <v-menu v-if="roleStore.role == 'admin'">
        <template #activator="{ props }">
          <v-btn class="p-0" :class="leaveCount > 0 || overtimeCount > 0 || adjustmentCount > 0 ? 'text-red' : ''" v-bind="props">
            <v-icon icon="mdi-bell-badge-outline" />
            <span>通知</span>
          </v-btn>
        </template>
        <v-list>
          <v-list-item v-if="leaveCount > 0" @click="router.push({ path: 'leave' })">
            <v-list-item-title class="flex items-center">
              <v-icon icon="mdi-logout" />
              <span>有 {{ leaveCount }} 個請假申請尚待審批</span>
            </v-list-item-title>
          </v-list-item>
          <v-list-item v-if="overtimeCount > 0" @click="router.push({ path: 'overtime' })">
            <v-list-item-title class="flex items-center">
              <v-icon icon="mdi-logout" />
              <span>有 {{ overtimeCount }} 個加班申請尚待審批</span>
            </v-list-item-title>
          </v-list-item>
          <v-list-item v-if="adjustmentCount > 0" @click="router.push({ path: 'adjustment' })">
            <v-list-item-title class="flex items-center">
              <v-icon icon="mdi-logout" />
              <span>有 {{ adjustmentCount }} 個補卡申請尚待審批</span>
            </v-list-item-title>
          </v-list-item>
        </v-list>
      </v-menu>

      <v-divider inset vertical thickness="1" />
      <div class="flex items-center ml-2">
        <v-avatar image="https://cube.elemecdn.com/0/88/03b0d39583f48206768a7534e55bcpng.png" />
        <div class="ml-2 hidden md:block">
          <span>{{ chnName }}<br />{{ engName }}</span>
        </div>
        <v-menu>
          <template #activator="{ props }">
            <v-btn density="comfortable" icon="mdi-menu-down" v-bind="props" />
          </template>
          <v-list>
            <!-- <v-list-item>
              <v-list-item-title class="flex items-center"> <v-icon icon="mdi-account" /> 資訊 </v-list-item-title>
            </v-list-item>
            <v-list-item>
              <v-list-item-title class="flex items-center"> <v-icon icon="mdi-cog-outline" /> 設定 </v-list-item-title>
            </v-list-item> -->
            <v-list-item @click="handleLogout">
              <v-list-item-title class="flex items-center"> <v-icon icon="mdi-logout" /> 登出 </v-list-item-title>
            </v-list-item>
          </v-list>
        </v-menu>
      </div>
    </div>
  </v-container>
</template>

<script lang="ts" setup>
  import { dbRef, logout } from '@/firebase';
  import router from '@/router';
  import { useLogoStore } from '@/store/logo';
  import { useMessageStore } from '@/store/message';
  import { useRoleStore } from '@/store/role';
  import { equalTo, get, onValue, orderByChild, query } from 'firebase/database';
  import { ref as storageRef } from 'firebase/storage';
  import { onUnmounted } from 'vue';
  import { onMounted, ref } from 'vue';
  import { useFirebaseStorage, useStorageFile } from 'vuefire';
  import { useTheme } from 'vuetify';

  // Get current theme
  const theme = useTheme();
  // Get dark mode reference
  const darkMode = ref(theme.global.current.value.dark);
  // handle change of dark/light theme
  const toggleTheme = () => {
    theme.global.name.value = darkMode.value ? 'light' : 'dark';
  };

  const storage = useFirebaseStorage(); // Firebase storage
  const logoRef = storageRef(storage, 'images/logo.png'); // Logo reference
  const { url: logoUrl } = useStorageFile(logoRef);
  const logoStore = useLogoStore();
  const info = ref();

  onValue(dbRef('company/info'), (data) => {
    info.value = data.val();
  });

  const messageStore = useMessageStore();
  // Logout function
  const handleLogout = async () => {
    await logout()
      .then(() => {
        messageStore.showMessage('登出成功！');
      })
      .catch((err) => {
        console.error(err);
      });
  };

  const roleStore = useRoleStore();
  const chnName = ref('');
  const engName = ref('');

  const leaveCount = ref(0);
  const overtimeCount = ref(0);
  const adjustmentCount = ref(0);

  const getLeaveCount = async () => {
    const leaves = await get(query(dbRef(`company/leave`), orderByChild('status'), equalTo('pending')));
    leaveCount.value = leaves.size;
  };

  const getOvertimeCount = async () => {
    const overtimes = await get(query(dbRef(`company/overtime`), orderByChild('status'), equalTo('pending')));
    overtimeCount.value = overtimes.size;
  };

  const getAdjustmentCount = async () => {
    const adjustments = await get(query(dbRef(`company/adjustment`), orderByChild('status'), equalTo('pending')));
    adjustmentCount.value = adjustments.size;
  };

  const unsubscribeLeave = onValue(dbRef(`company/leave`), async () => {
    await getLeaveCount();
  });

  const unsubscribeOvertime = onValue(dbRef(`company/overtime`), async () => {
    await getOvertimeCount();
  });

  const unsubscribeAdjustment = onValue(dbRef(`company/adjustment`), async () => {
    await getAdjustmentCount();
  });

  onMounted(async () => {
    if (roleStore.role == 'admin') {
      chnName.value = '管理員';
      engName.value = 'Admin';
    } else if (roleStore.role == 'user') {
      await get(dbRef(`users/info/${roleStore.uid}`)).then((snapshot) => {
        const data = snapshot.val();
        chnName.value = data?.chnName;
        engName.value = data?.engName;
      });
    }
    await getLeaveCount();
    await getOvertimeCount();
    await getAdjustmentCount();
  });

  onUnmounted(() => {
    unsubscribeLeave();
    unsubscribeOvertime();
    unsubscribeAdjustment();
  });
</script>

<style>
  .v-switch--inset .v-switch__track {
    background-color: #c4c8ca !important;
  }
  .mdi-white-balance-sunny {
    color: black;
  }
  .mdi-weather-night {
    color: white;
  }
</style>
