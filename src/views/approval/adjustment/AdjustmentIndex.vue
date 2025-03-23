<template>
  <adminView v-if="roleStore.role == 'admin'"></adminView>
  <userView v-else></userView>
</template>

<script setup lang="ts">
  import { useRoleStore } from '@/store/role';
  import { defineAsyncComponent } from 'vue';

  const roleStore = useRoleStore();

  const adminView = defineAsyncComponent(() => import('@/views/approval/adjustment/AdjustmentAdmin.vue'));
  const userView = defineAsyncComponent(() => import('@/views/approval/adjustment/AdjustmentUser.vue'));
</script>
