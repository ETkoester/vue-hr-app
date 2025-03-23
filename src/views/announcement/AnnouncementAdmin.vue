<template>
  <v-container class="h-full" fluid>
    <v-row class="p-4">
      <v-text-field v-model="search" label="搜尋" prepend-inner-icon="mdi-magnify" variant="outlined" hide-details clearable density="compact" class="my-4"> </v-text-field>
      <v-btn density="compact" color="green-darken-4" size="large" class="ml-2 my-auto p-2" @click="onCreate">
        <v-icon>mdi-account-plus</v-icon>
        <span>新增公告</span>
      </v-btn>
    </v-row>
    <v-data-table class="p-2" items-per-page="-1" :headers="headers" :items="announcements" :search="search" item-value="name" items-per-page-text="每頁行數">
      <template #[`item.title`]="{ item }">
        <div class="max-w-[200px] overflow-hidden text-ellipsis whitespace-nowrap">
          <span>{{ item.columns.title }}</span>
        </div>
      </template>
      <template #[`item.content`]="{ item }">
        <div class="max-w-[300px] overflow-hidden text-ellipsis whitespace-nowrap">
          <span>{{ item.columns.content }}</span>
        </div>
      </template>
      <template #[`item.createAt`]="{ item }">
        <div class="min-w-[90px]">
          <span>{{ item.columns.createAt }}</span>
        </div>
      </template>
      <template #[`item.updateAt`]="{ item }">
        <div class="min-w-[90px]">
          <span>{{ item.columns.updateAt }}</span>
        </div>
      </template>
      <template #[`item.action`]="{ item }">
        <div class="hidden md:flex w-[40px]">
          <v-tooltip location="top">
            <template #activator="{ props }">
              <v-btn density="compact" color="grey" icon="mdi-eye" size="large" class="mr-2" v-bind="props" @click="onView(item.raw)" />
            </template>
            <span>檢視</span>
          </v-tooltip>
          <v-tooltip location="top">
            <template #activator="{ props }">
              <v-btn density="compact" color="light-blue" icon="mdi-file-edit" size="large" class="mr-2" v-bind="props" @click="onEdit(item.raw)" />
            </template>
            <span>編輯</span>
          </v-tooltip>
          <v-tooltip location="top">
            <template #activator="{ props }">
              <v-btn density="compact" color="red" icon="mdi-delete" size="large" class="mr-2" v-bind="props" @click="confirmDelete(item.raw.id)" />
            </template>
            <span>刪除</span>
          </v-tooltip>
        </div>
        <v-menu>
          <template #activator="{ props }">
            <div class="min-w-[30px] md:hidden">
              <v-btn icon="mdi-dots-vertical" density="compact" v-bind="props" />
            </div>
          </template>
          <v-list>
            <v-list-item @click="console.log('view')">
              <v-list-item-title class="flex items-center"> <v-icon icon="mdi-eye" /> 檢視 </v-list-item-title>
            </v-list-item>
            <v-list-item @click="console.log('edit')">
              <v-list-item-title class="flex items-center"> <v-icon icon="mdi-file-edit" /> 編輯 </v-list-item-title>
            </v-list-item>
            <v-list-item @click="console.log('delete')">
              <v-list-item-title class="flex items-center"> <v-icon icon="mdi-delete" /> 刪除 </v-list-item-title>
            </v-list-item>
          </v-list>
        </v-menu>
      </template>
      <template #[`item.name`]="{ item }">
        <span class="block min-w-[55px]">{{ item.raw.title }}<br />{{ item.raw.content }}</span>
      </template>
    </v-data-table>
  </v-container>

  <v-dialog v-model="announcementDialog" :fullscreen="windowWidth < 550" persistent :width="windowWidth < 550 ? '550' : '500'">
    <v-card>
      <v-toolbar dark color="green-darken-4">
        <v-btn icon dark @click="announcementDialog = false">
          <v-icon>mdi-close</v-icon>
        </v-btn>
        <v-toolbar-title>{{ action == 'create' ? '新增' : action == 'edit' ? '編輯' : '檢視' }}公告</v-toolbar-title>
        <v-spacer></v-spacer>
      </v-toolbar>
      <v-form class="p-4">
        <v-text-field v-model="form.title" label="公告標題" prepend-inner-icon="mdi-format-text-variant" required :error-messages="v$.title.$errors.map((e) => e.$message.toString())" :readonly="action == 'view'" @blur="v$.title.$touch" />
        <v-textarea v-model="form.content" label="公告內容" :error-messages="v$.content.$errors.map((e) => e.$message.toString())" :readonly="action == 'view'" @blur="v$.content.$touch" />
      </v-form>
      <v-card-actions v-if="action != 'view'">
        <v-btn variant="flat" color="green-darken-4" @click="onSubmit(action)">提交</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

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
          <span>是否確定要刪除此公告？</span>
        </v-card-text>
        <v-card-actions>
          <v-btn variant="flat" color="grey" @click="deleteDialog = false">取消</v-btn>
          <v-spacer />
          <v-btn variant="flat" color="red" @click="onAction(deleteID, 'delete')">刪除</v-btn>
        </v-card-actions>
      </v-container>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
  import { dbRef } from '@/firebase';
  import { useLoadingStore } from '@/store/loading';
  import { AnnouncementDetail } from '@/types';
  import { useVuelidate } from '@vuelidate/core';
  import { helpers, required } from '@vuelidate/validators';
  import { format } from 'date-fns';
  import { get, remove, push, update } from 'firebase/database';
  import { onBeforeMount, onMounted, reactive, ref } from 'vue';

  const loadingStore = useLoadingStore();

  const announcementDialog = ref(false);

  const search = ref();

  const windowWidth = ref(window.innerWidth);

  onBeforeMount(() => {
    window.removeEventListener('resize', onResize);
  });

  const onResize = () => {
    windowWidth.value = window.innerWidth;
  };

  onMounted(async () => {
    window.addEventListener('resize', onResize);
    loadingStore.update(true);
    await getAnnouncement();
    loadingStore.update(false);
  });

  const headers = [
    { title: '標題', key: 'title' },
    { title: '內容', key: 'content' },
    { title: '新增日期', key: 'createAt' },
    { title: '修改日期', key: 'updateAt' },
    { title: '操作', key: 'action', sortable: false },
  ];

  const initForm = {
    title: '',
    content: '',
    createAt: '',
    updateAt: '',
  };

  const form = reactive({ ...initForm });

  const action = ref('');
  let editID = '';

  const rules = {
    title: { required: helpers.withMessage('請輸入公告標題', required) },
    content: { required: helpers.withMessage('請輸入公告內容', required) },
  };

  const v$ = useVuelidate(rules, form);

  interface Announcement extends AnnouncementDetail {
    id: string;
  }

  const announcements = reactive<Announcement[]>([]);

  const getAnnouncement = async () => {
    announcements.length = 0;
    const announcementRecords = await get(dbRef('company/announcement'));
    if (announcementRecords.val() == undefined) return;

    Object.entries(announcementRecords.val()).forEach(([id, value]) => {
      const announcement = { id: id, ...(value as object) } as Announcement;
      announcements.push(announcement);
    });
    console.log(announcements);
  };

  const onSubmit = async (action: string) => {
    const validForm = await v$.value.$validate();
    if (!validForm) return;
    loadingStore.update(true);
    if (action == 'create') form.createAt = format(new Date(), 'yyyy-MM-dd HH:mm');
    form.updateAt = format(new Date(), 'yyyy-MM-dd HH:mm');
    if (action == 'create') {
      await push(dbRef('company/announcement'), form);
    } else if (action == 'edit') {
      await update(dbRef(`company/announcement/${editID}`), form);
    }
    resetForm();
    await getAnnouncement();
    announcementDialog.value = false;
    loadingStore.update(false);
  };

  const onCreate = () => {
    resetForm();
    action.value = 'create';
    announcementDialog.value = true;
  };

  const onEdit = (announcement: Announcement) => {
    action.value = 'edit';
    editID = announcement.id;
    form.title = announcement.title;
    form.content = announcement.content;
    form.createAt = announcement.createAt;
    announcementDialog.value = true;
  };

  const onView = (announcement: Announcement) => {
    action.value = 'view';
    form.title = announcement.title;
    form.content = announcement.content;
    announcementDialog.value = true;
  };

  const deleteDialog = ref(false);
  let deleteID = '';

  const onAction = async (id: string, action: string) => {
    loadingStore.update(true);
    switch (action) {
      case 'delete':
        await remove(dbRef(`company/announcement/${id}`));
        deleteDialog.value = false;
        break;
    }
    await getAnnouncement();
    loadingStore.update(false);
  };

  const confirmDelete = (id: string) => {
    deleteID = id;
    deleteDialog.value = true;
  };

  const resetForm = () => {
    v$.value.$reset();
    Object.assign(form, initForm);
  };
</script>
