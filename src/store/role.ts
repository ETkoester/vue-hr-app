// Utilities
import { useLocalStorage } from '@vueuse/core';
import { defineStore } from 'pinia';

export const useRoleStore = defineStore('role', {
  state: () => ({
    role: useLocalStorage('role', ''), // Role of current user
    uid: useLocalStorage('uid', ''), // User ID of current user
  }),
  actions: {
    // Store the role and user ID when login
    login(uid: string) {
      this.uid = uid;
    },
    // Reset the role and user ID when logout
    logout() {
      this.role = '';
      this.uid = '';
    },
    setRole(role: string) {
      this.role = role;
    },
  },
});
