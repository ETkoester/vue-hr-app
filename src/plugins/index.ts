/**
 * plugins/index.ts
 *
 * Automatically included in `./src/main.ts`
 */

// Plugins
import CustomCalendar from '@/components/CustomCalendar.vue';
import VueGoogleMaps from '@fawmi/vue-google-maps';
import VueDatePicker from '@vuepic/vue-datepicker';
import '@vuepic/vue-datepicker/dist/main.css';
import { Calendar, DatePicker, setupCalendar } from 'v-calendar';
import 'v-calendar/style.css';
import router from '../router';
import pinia from '../store';
import vuetify from './vuetify';
import { loadFonts } from './webfontloader';

// Types
import type { App } from 'vue';

export function registerPlugins(app: App) {
  loadFonts();
  app
    .use(vuetify)
    .use(router)
    .use(pinia)
    .use(VueGoogleMaps, {
      load: {
        key: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
        libraries: 'places',
      },
    })
    .use(setupCalendar, {})
    .component('VueDatePicker', VueDatePicker)
    .component('VcCalendar', Calendar)
    .component('VcDatePicker', DatePicker)
    .component('CustomCalendar', CustomCalendar);
}
