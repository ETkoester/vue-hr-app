import { defineStore } from 'pinia';

export const useLogoStore = defineStore('logo', {
  state: () => ({
    url: '', // URL of webisite logo
  }),
  actions: {
    // Update logo URL
    updateURL(url: string) {
      this.url = url;
    },
  },
});
