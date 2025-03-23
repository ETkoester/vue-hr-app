/**
 * plugins/vuetify.ts
 *
 * Framework documentation: https://vuetifyjs.com`
 */

// Styles
import '@mdi/font/css/materialdesignicons.css';
import 'vuetify/styles';

// Composables
import { createVuetify } from 'vuetify';
import { VDataTable } from 'vuetify/labs/VDataTable';
import { VStepper } from 'vuetify/labs/VStepper';

// https://vuetifyjs.com/en/introduction/why-vuetify/#feature-guides
export default createVuetify({
  theme: {
    defaultTheme: 'light',
    themes: {
      light: {
        colors: {
          primary: '#1867C0',
          secondary: '#5CBBF6',
          background: '#fbfbfb',
          surface: '#ffffff',
          card: '#ffffff',
        },
      },
      dark: {
        colors: {
          primary: '#1c1b29',
          background: '#1c1b29',
          surface: '#353541',
          card: '#353541',
        },
      },
    },
  },
  components: {
    VDataTable,
    VStepper,
  },
});
