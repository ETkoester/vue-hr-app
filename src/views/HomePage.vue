<template>
  <v-container class="h-full" fluid>
    <!-- time -->
    <p class="text-h6 text-center">{{ currentDate }}</p>
    <p class="text-h2 text-center mb-4">{{ currentTime }}</p>
    <!-- 1st row -->
    <v-row>
      <!-- announcement -->
      <v-col cols="12" md="6">
        <v-card>
          <v-card-title class="text-center">最新公告</v-card-title>
          <v-card-item>
            <v-list class="h-[150px]">
              <v-list-item v-for="announcement in announcements" :key="announcement.id" :title="announcement.title" :subtitle="announcement.content">
                <template #prepend>
                  <div class="whitespace-nowrap mr-2 w-[80px]">
                    <span>{{ announcement.createAt.split(' ')[0] }}</span>
                  </div>
                </template>

                <template #append>
                  <div class="flex">
                    <v-btn variant="text" class="text-sm text-blue whitespace-nowrap" @click="showAnnouncement(announcement)">查看更多...</v-btn>
                  </div>
                </template>
              </v-list-item>
            </v-list>
          </v-card-item>
        </v-card>
      </v-col>
      <!-- shortcut -->
      <v-col>
        <v-card>
          <v-card-title class="text-center">捷徑</v-card-title>
          <v-card-item>
            <v-row dense class="text-center h-[150px]">
              <v-col v-for="(shortcut, index) in shortcuts" :key="`shortcut${index}`" cols="3">
                <v-btn :color="colors[index].value" type="text" @click="router.push({ path: `${router.hasRoute(shortcut.route) ? shortcut.route : shortcut.altRoute}` })">
                  <v-icon>{{ shortcut.icon }}</v-icon>
                  {{ shortcut.name }}
                </v-btn>
              </v-col>
            </v-row>
          </v-card-item>
        </v-card>
      </v-col>
    </v-row>
    <!-- 2nd row -->
    <v-row>
      <!-- calender -->
      <v-col col="12" md="6">
        <vc-calendar :attributes="attributes" :is-dark="darkMode" locale="zh-TW" expanded @dayclick="onDayClickHandler" />
      </v-col>
      <!-- TodoList -->
      <v-col col="12" md="6">
        <v-card>
          <v-toolbar :color="'green-darken-4'" dark>
            <v-toolbar-title class="flex-none">{{ selectDate }} 行程</v-toolbar-title>
            <v-spacer></v-spacer>
            <v-btn density="compact" color="white" size="large" class="ml-2 my-auto p-2" @click="onCreate">
              <v-icon>mdi-calendar-plus</v-icon>
              <span>新增行程</span>
            </v-btn>
          </v-toolbar>
          <v-container class="p-0">
            <v-list>
              <v-list-item v-if="todoToday.length == 0">
                <p>未有行程</p>
              </v-list-item>
              <v-list-item v-for="(todo, index) in todoToday" :key="index" :title="todo.description" :subtitle="`${todo.start} - ${todo.end}`">
                <template v-if="!todo.readonly" #append>
                  <v-btn class="mr-1" variant="text" color="blue-lighten-2" icon="mdi-pencil" density="compact" @click="onEdit(todo)" />
                  <v-btn variant="text" color="red-lighten-2" icon="mdi-delete" density="compact" @click="confirmDelete(todo.id)" />
                </template>
              </v-list-item>
            </v-list>
          </v-container>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
  <!-- schedule dialog -->
  <v-dialog v-model="eventDialog" :fullscreen="windowWidth < 550" persistent :width="windowWidth < 550 ? '550' : '500'">
    <v-card class="min-h-[750px]">
      <v-toolbar dark color="green-darken-4">
        <v-btn icon dark @click="eventDialog = false">
          <v-icon>mdi-close</v-icon>
        </v-btn>
        <v-toolbar-title>{{ action == 'create' ? '新增' : action == 'edit' ? '編輯' : '檢視' }}行程</v-toolbar-title>
        <v-spacer></v-spacer>
      </v-toolbar>
      <v-form class="p-4">
        <v-text-field v-model="form.description" label="行程" prepend-inner-icon="mdi-format-text-variant" required :error-messages="v$.description.$errors.map((e) => e.$message.toString())" @blur="v$.description.$touch" />
        <v-select v-model="form.color" label="顏色" prepend-inner-icon="mdi-palette-outline" :items="colors" item-title="name" item-value="value" />
        <vc-date-picker v-model.range="range" mode="dateTime" is-required is24hr :popover="popover">
          <template #default="{ togglePopover }">
            <v-text-field v-model="showRange" label="期限" prepend-inner-icon="mdi-calendar-month-outline" required readonly @click="togglePopover" />
          </template>
        </vc-date-picker>
      </v-form>
      <v-card-actions v-if="action != 'view'">
        <v-spacer />
        <v-btn variant="flat" color="green-darken-4" @click="onSubmit(action)">提交</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
  <!-- delect dialog -->
  <v-dialog v-model="deleteDialog" persistent width="400">
    <v-card>
      <v-toolbar dark color="green-darken-4">
        <v-btn icon dark @click="deleteDialog = !deleteDialog">
          <v-icon>mdi-close</v-icon>
        </v-btn>
        <v-toolbar-title>刪除提示</v-toolbar-title>
        <v-spacer></v-spacer>
      </v-toolbar>
      <v-container>
        <v-card-text>
          <span>是否確定要刪除此紀錄？</span>
        </v-card-text>
        <v-card-actions>
          <v-btn variant="flat" color="grey" @click="deleteDialog = false">取消</v-btn>
          <v-spacer />
          <v-btn variant="flat" color="red" @click="onDelete">刪除</v-btn>
        </v-card-actions>
      </v-container>
    </v-card>
  </v-dialog>
  <!-- announcemnt dialog -->
  <v-dialog v-model="announcementDialog" :fullscreen="windowWidth < 550" persistent :width="windowWidth < 550 ? '550' : '500'">
    <v-card>
      <v-toolbar dark color="green-darken-4">
        <v-btn icon dark @click="announcementDialog = false">
          <v-icon>mdi-close</v-icon>
        </v-btn>
        <v-toolbar-title>公告</v-toolbar-title>
        <v-spacer></v-spacer>
      </v-toolbar>
      <v-form class="p-4">
        <v-text-field v-model="announcement_form.title" label="公告標題" :readonly="action == 'view'" />
        <v-textarea v-model="announcement_form.content" label="公告內容" :readonly="action == 'view'" rows="10" />
      </v-form>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
  import { dbRef } from '@/firebase';
  import router from '@/router';
  import { useLoadingStore } from '@/store/loading';
  import { useRoleStore } from '@/store/role';
  import { AnnouncementDetail, ApprovalDetail, TodoDetail } from '@/types';
  import { useVuelidate } from '@vuelidate/core';
  import { helpers, required } from '@vuelidate/validators';
  import { format } from 'date-fns';
  import { zhHK } from 'date-fns/locale';
  import { equalTo, get, orderByChild, push, query, remove, update } from 'firebase/database';
  import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
  import { useTheme } from 'vuetify';

  //init
  const loadingStore = useLoadingStore();
  const roleStore = useRoleStore();
  const action = ref('');
  const theme = useTheme();
  const darkMode = computed(() => theme.global.current.value.dark);
  const popover = ref({
    visibility: 'click',
    placement: 'bottom',
  });
  const announcementDialog = ref(false);

  const now = ref(new Date());
  const currentDate = computed(() => format(now.value, 'yyyy-MM-dd EEEE', { locale: zhHK }));
  const currentTime = computed(() => format(now.value, 'HH:mm:ss'));
  const updateTimeInterval = setInterval(() => {
    now.value = new Date();
  }, 1000);

  const windowWidth = ref(window.innerWidth);

  const onResize = () => {
    windowWidth.value = window.innerWidth;
  };

  onBeforeUnmount(() => {
    clearInterval(updateTimeInterval);
    window.removeEventListener('resize', onResize);
  });

  onMounted(async () => {
    loadingStore.update(true);
    window.addEventListener('resize', onResize);
    await getTodoList();
    await getAnnouncement();
    await getLeaves();
    loadingStore.update(false);
  });
  //announcement
  const announcement_initForm = {
    title: '',
    content: '',
  };

  const announcement_form = reactive({ ...announcement_initForm });

  interface Announcement extends AnnouncementDetail {
    id: string;
  }

  const announcements = reactive<Announcement[]>([]);

  const getAnnouncement = async () => {
    announcements.length = 0;
    const announcementRecords = await get(query(dbRef('company/announcement'), orderByChild('createAt')));
    if (announcementRecords.val() == undefined) return;

    Object.entries(announcementRecords.val()).forEach(([id, value]) => {
      const announcement = { id: id, ...(value as object) } as Announcement;
      announcements.unshift(announcement);
    });
  };
  const showAnnouncement = (announcement: Announcement) => {
    action.value = 'view';
    announcement_form.title = announcement.title;
    announcement_form.content = announcement.content;
    announcementDialog.value = true;
  };

  interface Leave extends ApprovalDetail {
    id: string;
  }

  const leaves = reactive<Leave[]>([]);

  const getLeaves = async () => {
    leaves.length = 0;
    const leaveRecords = await get(query(dbRef('company/leave'), orderByChild('empID'), equalTo(roleStore.uid)));
    if (leaveRecords.val() == undefined) return;

    Object.entries(leaveRecords.val()).forEach(([id, value]) => {
      const leave = { id: id, ...(value as object) } as Leave;
      if (leave.status == 'approved') {
        leaves.push(leave);
      }
    });
  };
  //schedule
  const eventDialog = ref(false);

  const showRange = computed(() => `${format(range.value.start, 'yyyy-MM-dd HH:mm')} - ${format(range.value.end, 'yyyy-MM-dd HH:mm')}`);
  const range = ref({
    start: new Date(),
    end: new Date(),
  });

  const colors = [
    { name: '紅色', value: 'red' },
    { name: '橙色', value: 'orange' },
    { name: '黃色', value: 'yellow' },
    { name: '綠色', value: 'green' },
    { name: '青色', value: 'teal' },
    { name: '藍色', value: 'blue' },
    { name: '靛青色', value: 'indigo' },
    { name: '紫色', value: 'purple' },
    { name: '粉紅色', value: 'pink' },
    { name: '灰色', value: 'gray' },
  ];

  const initForm = {
    description: '',
    color: 'blue',
    start: computed(() => format(range.value.start, 'yyyy-MM-dd HH:mm')),
    end: computed(() => format(range.value.end, 'yyyy-MM-dd HH:mm')),
  };

  const form = reactive({ ...initForm });

  const rules = {
    description: { required: helpers.withMessage('請輸入行程', required) },
  };

  const v$ = useVuelidate(rules, form);

  const onCreate = () => {
    action.value = 'create';
    range.value.start = new Date(selectDate.value);
    range.value.end = new Date(selectDate.value);
    eventDialog.value = true;
  };

  const getTodoList = async () => {
    todos.length = 0;
    const todoRecords = await get(dbRef(`users/todo/${roleStore.uid}`));
    if (todoRecords.val() == undefined) return;

    Object.entries(todoRecords.val()).forEach(([id, value]) => {
      const todo = { id: id, ...(value as object) } as Todo;
      todos.push(todo);
    });
  };

  const onSubmit = async (action: string) => {
    const validForm = await v$.value.$validate();
    if (!validForm) return;
    loadingStore.update(true);
    if (action == 'create') {
      await push(dbRef(`users/todo/${roleStore.uid}`), form);
    } else if (action == 'edit') {
      await update(dbRef(`users/todo/${roleStore.uid}/${editID.value}`), form);
    }
    resetForm();
    await getTodoList();
    eventDialog.value = false;
    loadingStore.update(false);
  };

  const onDelete = async () => {
    await remove(dbRef(`users/todo/${roleStore.uid}/${deleteID}`));
    await getTodoList();
    deleteDialog.value = false;
  };

  interface Todo extends TodoDetail {
    id: string;
  }

  const todos = reactive<Todo[]>([]);
  const todoToday = computed(() => [
    ...leaves
      .filter((leave) => {
        return leave.start.slice(0, 10) <= selectDate.value && (leave.end ?? '').slice(0, 10) >= selectDate.value;
      })
      .map((leave) => {
        return {
          id: leave.id,
          color: 'yellow',
          description: leave.type ?? '',
          start: leave.start,
          end: leave.end ?? '',
          readonly: true,
        };
      }),
    ...todos.filter((todo) => {
      return todo.start.slice(0, 10) <= selectDate.value && todo.end.slice(0, 10) >= selectDate.value;
    }),
  ]);

  const attributes = computed(() => [
    ...todos.map((todo) => ({
      dates: { start: new Date(todo.start), end: new Date(todo.end) },
      dot: {
        color: todo.color,
        class: 'opacity-75',
      },
      popover: {
        label: todo.description,
      },
    })),
    ...leaves.map((leave) => ({
      dates: { start: new Date(leave.start), end: new Date(leave.end ?? '') },
      highlight: {
        color: 'yellow',
      },
      popover: {
        label: leave.type,
      },
    })),
  ]);

  const resetForm = () => {
    v$.value.$reset();
    Object.assign(form, initForm);
  };

  const selectDate = ref(format(new Date(), 'yyyy-MM-dd'));

  const onDayClickHandler = (day: { id: string }) => {
    selectDate.value = day.id;
  };

  const deleteDialog = ref(false);
  let deleteID = '';

  const confirmDelete = (id: string) => {
    action.value = 'delete';
    deleteID = id;
    deleteDialog.value = true;
  };

  const editID = ref('');

  const onEdit = (todo: Todo) => {
    action.value = 'edit';
    editID.value = todo.id;
    form.color = todo.color;
    form.description = todo.description;
    range.value.start = new Date(todo.start);
    range.value.end = new Date(todo.end);
    eventDialog.value = true;
  };

  //shortcut
  const shortcuts = [
    //打卡
    { icon: 'mdi-map-marker-radius', name: '打卡', route: 'punch', altRoute: 'location' },
    //補卡
    { icon: 'mdi-clock-alert-outline', name: '補卡', route: 'adjustment', altRoute: '' },
    //加班
    { icon: 'mdi-desk-lamp', name: '加班', route: 'overtime', altRoute: '' },
    //請假
    { icon: 'mdi-home-clock', name: '請假', route: 'leave', altRoute: '' },
    //更表
    { icon: 'mdi-list-box-outline', name: '更表', route: 'roster', altRoute: '' },
    //公司
    { icon: 'mdi-office-building', name: '公司', route: 'company', altRoute: '' },
    // 紀錄
    { icon: 'mdi-note-edit', name: '紀錄', route: 'attendance', altRoute: '' },
  ];
</script>
