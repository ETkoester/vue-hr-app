<template>
  <v-container fluid class="h-full">
    <v-row>
      <v-col col="12" md="6">
        <v-form class="p-3">
          <v-btn color="green-darken-4" dark class="mb-4 md:hidden" @click="recordDialog = true">
            <v-icon>mdi-list-box-outline</v-icon>
            <span>補卡紀錄</span>
          </v-btn>
          <v-select v-model="form.type" label="補卡類型" :items="['上班', '下班']" />
          <VueDatePicker v-model="startDate" time-picker-inline locale="zh" :alt-position="() => ({ top: 65 })" cancel-text="取消" select-text="選擇">
            <template #trigger>
              <v-text-field v-model="form.start" label="補卡時間" required readonly />
            </template>
          </VueDatePicker>
          <v-textarea v-model="form.reason" label="原因" :error-messages="v$.reason.$errors.map((e) => e.$message.toString())" @blur="v$.reason.$touch" />
          <div class="d-flex align-start flex-column">
            <v-btn color="green-darken-4" dark size="large" class="w-full min-[600px]:w-auto" @click="onSubmit"> 提交 </v-btn>
          </div>
        </v-form>
      </v-col>
      <v-col col="6" class="hidden md:block">
        <v-card>
          <v-toolbar dark color="green-darken-4">
            <v-toolbar-title>補卡紀錄</v-toolbar-title>
            <v-spacer></v-spacer>
          </v-toolbar>
          <v-container>
            <v-tabs v-model="tab" fixed-tabs bg-color="green-darken-4">
              <v-tab v-for="(tabItem, index) in tabs" :key="`tab${index}`" :value="tabItem.status"> {{ tabItem.title }} </v-tab>
            </v-tabs>
            <v-window v-model="tab">
              <v-window-item v-for="(tabItem, index) in tabs" :key="`tab${index}`" :value="tabItem.status">
                <p v-if="JSON.stringify(filterAdjustments) == '{}'" class="p-4">未有紀錄</p>
                <v-card v-for="(adjustment, key) in filterAdjustments" v-else :key="key" class="mb-2">
                  <v-container>
                    <div>
                      <p>申請日期：{{ adjustment.apply }}</p>
                      <p>補卡類型：{{ adjustment.type }}</p>
                      <p>補卡時間：{{ adjustment.start }}</p>
                      <p>原因：{{ adjustment.reason }}</p>
                    </div>
                    <v-btn v-if="adjustment.status != 'canceled'" class="mt-2" color="red" density="comfortable" @click="onCancel(key.toString())">撤銷</v-btn>
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
        <v-toolbar-title>補卡紀錄</v-toolbar-title>
        <v-spacer></v-spacer>
      </v-toolbar>
      <v-container>
        <v-tabs v-model="tab" fixed-tabs bg-color="green-darken-4">
          <v-tab v-for="(tabItem, index) in tabs" :key="`tab${index}`" :value="tabItem.status"> {{ tabItem.title }} </v-tab>
        </v-tabs>
        <v-window v-model="tab">
          <v-window-item v-for="(tabItem, index) in tabs" :key="`tab${index}`" :value="tabItem.status">
            <p v-if="JSON.stringify(filterAdjustments) == '{}'" class="p-4">未有紀錄</p>
            <v-card v-for="(adjustment, key) in filterAdjustments" v-else :key="key" class="mb-2">
              <v-container>
                <div>
                  <p>申請日期：{{ adjustment.apply }}</p>
                  <p>補卡類型：{{ adjustment.type }}</p>
                  <p>補卡時間：{{ adjustment.start }}</p>
                  <p>原因：{{ adjustment.reason }}</p>
                </div>
                <v-btn v-if="adjustment.status != 'canceled'" class="mt-2" color="red" density="comfortable" @click="onCancel(key.toString())">撤銷</v-btn>
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
  import { format } from 'date-fns';
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

  const filterAdjustments = computed(() => Object.fromEntries(Object.entries(adjustments).filter(([, value]) => value.status == tab.value)));

  const recordDialog = ref(false);

  const startDate = ref(new Date());

  const initForm = {
    type: '上班',
    start: computed(() => format(startDate.value, 'yyyy-MM-dd HH:mm')),
    reason: '',
    empID: roleStore.uid,
    status: 'pending',
    apply: '',
  };

  const form = reactive({ ...initForm });

  const rules = {
    start: { required: helpers.withMessage('請輸入開始時間', required) },
    reason: { required: helpers.withMessage('請輸入請假原因', required) },
  };

  const v$ = useVuelidate(rules, form);

  const onSubmit = async () => {
    const validForm = await v$.value.$validate();
    if (!validForm) return;
    loadingStore.update(true);
    form.apply = format(new Date(), 'yyyy-MM-dd HH:mm');
    await push(dbRef('company/adjustment'), form).catch((err) => {
      console.error(err);
      return;
    });
    messageStore.showMessage('成功提交補卡申請');
    v$.value.$reset();
    Object.assign(form, initForm);
    loadingStore.update(false);
  };

  const adjustments = reactive<Approval>({});
  const tab = ref('pending');
  const tabs = [
    { status: 'pending', title: '待審批' },
    { status: 'approved', title: '已批准' },
    { status: 'rejected', title: '已否決' },
    { status: 'canceled', title: '已撤銷' },
  ];

  const unsubscribe = onValue(query(dbRef('company/adjustment'), orderByChild('empID'), equalTo(roleStore.uid)), (snapshot) => {
    Object.keys(adjustments).forEach((key) => {
      delete adjustments[key];
    });
    if (snapshot.val() == undefined) return;

    Object.assign(adjustments, snapshot.val());
  });

  onMounted(async () => {
    window.addEventListener('resize', onResize);
  });

  onUnmounted(() => {
    unsubscribe();
  });

  const onCancel = async (id: string) => {
    loadingStore.update(true);
    await update(dbRef(`company/adjustment/${id}`), { status: 'canceled' });
    loadingStore.update(false);
  };
</script>
