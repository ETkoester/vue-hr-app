import { defineStore } from 'pinia';

export const useMessageStore = defineStore('message', {
  state: () => ({
    showStatus: false, // show message
    text: 'Login Success',
    color: 'green',
    icon: 'check',
  }),
  actions: {
    // Update loading status
    showMessage(message: string, type: string = 'success', color?: string, icon?: string) {
      this.color = 'green';
      this.icon = 'check';
      if (color) this.color = color;
      if (icon) this.icon = icon;
      if (type == 'error') {
        this.color = 'red';
        this.icon = 'alert-circle';
      }
      this.text = message;
      this.showStatus = true;
    },
  },
});
