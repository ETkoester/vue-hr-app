import { defineStore } from 'pinia';

export const useLoadingStore = defineStore('loading', {
  state: () => ({
    isLoading: false, // Status of loading page
  }),
  actions: {
    // Update loading status
    update(loading: boolean) {
      this.isLoading = loading;
    },
  },
});
