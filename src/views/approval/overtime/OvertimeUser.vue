<template>
  <v-container fluid class="h-full">
    <v-row>
      <v-col col="12" md="6">
        <v-form class="p-3">
          <v-btn color="green-darken-4" dark class="mb-4 md:hidden" @click="recordDialog = true">
            <v-icon>mdi-list-box-outline</v-icon>
            <span>加班紀錄</span>
          </v-btn>
          <VueDatePicker v-model="startDate" time-picker-inline locale="zh" :alt-position="() => ({ top: 65 })" cancel-text="取消" select-text="選擇" @update:model-value="updateDuration">
            <template #trigger>
              <v-text-field v-model="form.start" label="開始時間" required readonly :error-messages="v$.start.$errors.map((e) => e.$message.toString())" @blur="v$.start.$touch" />
            </template>
          </VueDatePicker>
          <VueDatePicker v-model="endDate" time-picker-inline locale="zh" :alt-position="() => ({ top: 65 })" cancel-text="取消" select-text="選擇" @update:model-value="updateDuration">
            <template #trigger>
              <v-text-field v-model="form.end" label="結束時間" required readonly :error-messages="v$.end.$errors.map((e) => e.$message.toString())" @blur="v$.end.$touch" />
            </template>
          </VueDatePicker>
          <v-text-field v-model="form.duration" label="持續時間" readonly />
          <v-textarea v-model="form.reason" label="原因" :error-messages="v$.reason.$errors.map((e) => e.$message.toString())" @blur="v$.reason.$touch" />
          <div class="d-flex align-start flex-column">
            <v-btn color="green-darken-4" dark size="large" class="w-full min-[600px]:w-auto" @click="onSubmit"> 提交 </v-btn>
          </div>
        </v-form>
      </v-col>
      <v-col col="6" class="hidden md:block">
        <v-card>
          <v-toolbar dark color="green-darken-4">
            <v-toolbar-title>加班紀錄</v-toolbar-title>
            <v-spacer></v-spacer>
          </v-toolbar>
          <v-container>
            <v-tabs v-model="tab" fixed-tabs bg-color="green-darken-4">
              <v-tab v-for="(tabItem, index) in tabs" :key="`tab${index}`" :value="tabItem.status"> {{ tabItem.title }} </v-tab>
            </v-tabs>
            <v-window v-model="tab">
              <v-window-item v-for="(tabItem, index) in tabs" :key="`tab${index}`" :value="tabItem.status">
                <p v-if="JSON.stringify(filterOvertimes) == '{}'" class="p-4">未有紀錄</p>
                <v-card v-for="(overtime, key) in filterOvertimes" v-else :key="key" class="mb-2">
                  <v-container>
                    <div>
                      <p>申請日期：{{ overtime.apply }}</p>
                      <p>開始時間：{{ overtime.start }}</p>
                      <p>結束時間：{{ overtime.end }}</p>
                      <p>原因：{{ overtime.reason }}</p>
                    </div>
                    <v-btn v-if="overtime.status != 'canceled'" class="mt-2" color="red" density="comfortable" @click="onCancel(key.toString())">撤銷</v-btn>
                  </v-container>
                </v-card>
              </v-window-item>
            </v-window>
          </v-container>
        </v-card>
      </v-col>
    </v-row>
  </v-container>

  <v-dialog v-model="recordDialog" :fullscreen="windowWidth < 550" persistent :width="windowWidth < 550 ? '550' : '500'">
    <v-card>
      <v-toolbar dark color="green-darken-4">
        <v-btn icon dark @click="recordDialog = false">
          <v-icon>mdi-close</v-icon>
        </v-btn>
        <v-toolbar-title>加班紀錄</v-toolbar-title>
        <v-spacer></v-spacer>
      </v-toolbar>
      <v-container>
        <v-tabs v-model="tab" fixed-tabs bg-color="green-darken-4">
          <v-tab v-for="(tabItem, index) in tabs" :key="`tab${index}`" :value="tabItem.status"> {{ tabItem.title }} </v-tab>
        </v-tabs>
        <v-window v-model="tab">
          <v-window-item v-for="(tabItem, index) in tabs" :key="`tab${index}`" :value="tabItem.status">
            <p v-if="JSON.stringify(filterOvertimes) == '{}'" class="p-4">未有紀錄</p>
            <v-card v-for="(overtime, key) in filterOvertimes" v-else :key="key" class="mb-2">
              <v-container>
                <div>
                  <p>申請日期：{{ overtime.apply }}</p>
                  <p>開始時間：{{ overtime.start }}</p>
                  <p>結束時間：{{ overtime.start }}</p>
                  <p>原因：{{ overtime.reason }}</p>
                </div>
                <v-btn v-if="overtime.status != 'canceled'" class="mt-2" color="red" density="comfortable" @click="onCancel(key.toString())">撤銷</v-btn>
              </v-container>
            </v-card>
          </v-window-item>
        </v-window>
      </v-container>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
  import { dbRef } from '@/firebase';
  import { useLoadingStore } from '@/store/loading';
  import { useMessageStore } from '@/store/message';
  import { useRoleStore } from '@/store/role';
  import { Approval } from '@/types';
  import useVuelidate from '@vuelidate/core';
  import { helpers, required } from '@vuelidate/validators';
  import { differenceInMinutes, format } from 'date-fns';
  import { equalTo, onValue, orderByChild, push, query, update } from 'firebase/database';
  import { computed, onBeforeMount, onMounted, onUnmounted, reactive, ref } from 'vue';

  const roleStore = useRoleStore();
  const messageStore = useMessageStore();
  const loadingStore = useLoadingStore();

  const windowWidth = ref(window.innerWidth);

  onBeforeMount(() => {
    window.removeEventListener('resize', onResize);
  });

  const onResize = () => {
    windowWidth.value = window.innerWidth;
  };

  const filterOvertimes = computed(() => Object.fromEntries(Object.entries(overtimes).filter(([, value]) => value.status == tab.value)));

  const recordDialog = ref(false);

  const startDate = ref(new Date());
  const endDate = ref(new Date());

  const initForm = {
    start: computed(() => format(startDate.value, 'yyyy-MM-dd HH:mm')),
    end: computed(() => format(endDate.value, 'yyyy-MM-dd HH:mm')),
    duration: '0日 0小時 0分鐘',
    reason: '',
    empID: roleStore.uid,
    status: 'pending',
    apply: '',
  };

  const form = reactive({ ...initForm });

  const validTime = () => {
    return form.start <= form.end;
  };

  const rules = {
    start: { required: helpers.withMessage('請輸入開始時間', required), validTime: helpers.withMessage('開始時間應小於結束時間', validTime) },
    end: { required: helpers.withMessage('請輸入結束時間', required), validTime: helpers.withMessage('結束時間應大於開始時間', validTime) },
    reason: { required: helpers.withMessage('請輸入請假原因', required) },
  };

  const v$ = useVuelidate(rules, form);

  const updateDuration = () => {
    const duration = differenceInMinutes(endDate.value, startDate.value, { roundingMethod: 'ceil' });
    const minutes = duration % 60;
    const hours = Math.floor(duration / 60) % 24;
    const days = Math.floor(duration / 60 / 24);
    form.duration = `${days}日 ${hours}小時 ${minutes}分鐘`;
  };

  const onSubmit = async () => {
    const validForm = await v$.value.$validate();
    if (!validForm) return;
    loadingStore.update(true);
    form.apply = format(new Date(), 'yyyy-MM-dd HH:mm');
    await push(dbRef('company/overtime'), form).catch((err) => {
      console.error(err);
      return;
    });
    messageStore.showMessage('成功提交加班申請');
    v$.value.$reset();
    Object.assign(form, initForm);
    loadingStore.update(false);
  };

  const overtimes = reactive<Approval>({});
  const tab = ref('pending');
  const tabs = [
    { status: 'pending', title: '待審批' },
    { status: 'approved', title: '已批准' },
    { status: 'rejected', title: '已否決' },
    { status: 'canceled', title: '已撤銷' },
  ];

  const unsubscribe = onValue(query(dbRef('company/overtime'), orderByChild('empID'), equalTo(roleStore.uid)), (snapshot) => {
    Object.keys(overtimes).forEach((key) => {
      delete overtimes[key];
    });
    if (snapshot.val() == undefined) return;
    Object.assign(overtimes, snapshot.val());
  });

  onMounted(async () => {
    window.addEventListener('resize', onResize);
  });

  onUnmounted(() => {
    unsubscribe();
  });

  const onCancel = async (id: string) => {
    loadingStore.update(true);
    await update(dbRef(`company/overtime/${id}`), { status: 'canceled' });
    loadingStore.update(false);
  };
</script>
