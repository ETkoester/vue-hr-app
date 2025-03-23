<template>
  <v-container fluid class="h-full">
    <v-row>
      <v-col col="12" md="6">
        <v-form class="p-3">
          <v-btn color="green-darken-4" dark class="mb-4 md:hidden" @click="recordDialog = true">
            <v-icon>mdi-list-box-outline</v-icon>
            <span>請假紀錄</span>
          </v-btn>
          <v-select v-model="form.type" label="類型" :items="leaveTypes" item-title="title" item-value="value" :error-messages="v$.type.$errors.map((e) => e.$message.toString())" @blur="v$.type.$touch" />
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
          <v-text-field v-model="form.duration" label="請假時長" readonly />
          <v-textarea v-model="form.reason" label="原因" :error-messages="v$.reason.$errors.map((e) => e.$message.toString())" @blur="v$.reason.$touch" />
          <div class="d-flex align-start flex-column">
            <v-btn color="green-darken-4" dark size="large" class="w-full min-[600px]:w-auto" @click="onSubmit"> 提交 </v-btn>
          </div>
        </v-form>
      </v-col>
      <v-col col="6" class="hidden md:block">
        <v-card>
          <v-toolbar dark color="green-darken-4">
            <v-toolbar-title>請假紀錄</v-toolbar-title>
            <v-spacer></v-spacer>
          </v-toolbar>
          <v-container>
            <v-tabs v-model="tab" fixed-tabs bg-color="green-darken-4">
              <v-tab v-for="(tabItem, index) in tabs" :key="`tab${index}`" :value="tabItem.status"> {{ tabItem.title }} </v-tab>
            </v-tabs>
            <v-window v-model="tab">
              <v-window-item v-for="(tabItem, index) in tabs" :key="`tab${index}`" :value="tabItem.status">
                <p v-if="JSON.stringify(filterLeaves) == '{}'" class="p-4">未有紀錄</p>
                <v-card v-for="(leave, key) in filterLeaves" v-else :key="key" class="mb-2">
                  <v-container>
                    <div>
                      <p>類型：{{ leave.type }}</p>
                      <p>申請日期：{{ leave.apply }}</p>
                      <p>開始時間：{{ leave.start }}</p>
                      <p>結束時間：{{ leave.end }}</p>
                      <p>原因：{{ leave.reason }}</p>
                    </div>
                    <v-btn v-if="leave.status != 'canceled'" class="mt-2" color="red" density="comfortable" @click="onCancel(key.toString())">撤銷</v-btn>
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
        <v-toolbar-title>請假紀錄</v-toolbar-title>
        <v-spacer></v-spacer>
      </v-toolbar>
      <v-container>
        <v-tabs v-model="tab" fixed-tabs bg-color="green-darken-4">
          <v-tab v-for="(tabItem, index) in tabs" :key="`tab${index}`" :value="tabItem.status"> {{ tabItem.title }} </v-tab>
        </v-tabs>
        <v-window v-model="tab">
          <v-window-item v-for="(tabItem, index) in tabs" :key="`tab${index}`" :value="tabItem.status">
            <p v-if="JSON.stringify(filterLeaves) == '{}'" class="p-4">未有紀錄</p>
            <v-card v-for="(leave, key) in filterLeaves" v-else :key="key" class="mb-2">
              <v-container>
                <div>
                  <p>類型：{{ leave.type }}</p>
                  <p>申請日期：{{ leave.apply }}</p>
                  <p>開始時間：{{ leave.start }}</p>
                  <p>結束時間：{{ leave.end }}</p>
                  <p>原因：{{ leave.reason }}</p>
                </div>
                <v-btn v-if="leave.status != 'canceled'" class="mt-2" color="red" density="comfortable" @click="onCancel(key.toString())">撤銷</v-btn>
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
  import { Approval, Roster, UserInfoDetail } from '@/types';
  import useVuelidate from '@vuelidate/core';
  import { helpers, required } from '@vuelidate/validators';
  import { differenceInDays, differenceInMinutes, format, isWithinInterval } from 'date-fns';
  import { equalTo, get, onValue, orderByChild, push, query, update } from 'firebase/database';
  import { onUnmounted } from 'vue';
  import { computed, onBeforeMount, onMounted, reactive, ref } from 'vue';

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

  const filterLeaves = computed(() => Object.fromEntries(Object.entries(leaves).filter(([, value]) => value.status == tab.value)));

  const recordDialog = ref(false);
  const startDate = ref(new Date());
  const endDate = ref(new Date());

  const leaveTypes = ref<{ title: string; value: string }[]>([]);

  const initForm = {
    type: '事假',
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
    return form.start.slice(0, 10) == form.end.slice(0, 10);
  };

  const rules = {
    type: { required: helpers.withMessage('請選擇請假類型', required) },
    start: { required: helpers.withMessage('請輸入開始時間', required), validTime: helpers.withMessage('開始時間與結束時間需為同一天', validTime) },
    end: { required: helpers.withMessage('請輸入結束時間', required), validTime: helpers.withMessage('開始時間與結束時間需為同一天', validTime) },
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
    await push(dbRef('company/leave'), form).catch((err) => {
      console.error(err);
      return;
    });
    messageStore.showMessage('成功提交請假申請');
    v$.value.$reset();
    Object.assign(form, initForm);
    updateDuration();
    loadingStore.update(false);
  };

  const leaves = reactive<Approval>({});
  const tab = ref('pending');
  const tabs = [
    { status: 'pending', title: '待審批' },
    { status: 'approved', title: '已批准' },
    { status: 'rejected', title: '已否決' },
    { status: 'canceled', title: '已撤銷' },
  ];

  const unsubscribe = onValue(query(dbRef('company/leave'), orderByChild('empID'), equalTo(roleStore.uid)), (snapshot) => {
    Object.keys(leaves).forEach((key) => {
      delete leaves[key];
    });
    if (snapshot.val() == undefined) return;

    Object.assign(leaves, snapshot.val());
  });

  const rosters = reactive<Roster>({});
  const getRoster = async () => {
    Object.keys(rosters).forEach((key) => {
      delete rosters[key];
    });
    const rosterRecords = await get(dbRef(`users/roster/${roleStore.uid}`));
    if (rosterRecords.val() == undefined) return;

    Object.assign(rosters, rosterRecords.val());
  };

  const calcLeave = (type: string): number => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const thisYear = yesterday.getFullYear();
    let calcDate = (type == 'sick' ? userInfo.empDate?.slice(5, 10) : userInfo.annualLeaveCalcDate) ?? '01-01';
    const beforeCalcDate = format(yesterday, 'MM-dd') < calcDate;

    // current year interval
    const interval = { start: new Date(), end: new Date() };
    if (beforeCalcDate) interval.start = new Date(`${thisYear - 1}-${calcDate}`);
    else interval.start = new Date(`${thisYear}-${calcDate}`);
    const calcDateYtd = new Date(interval.start);
    calcDateYtd.setFullYear(calcDateYtd.getFullYear() + 1);
    calcDateYtd.setDate(calcDateYtd.getDate() - 1);
    interval.end = new Date(calcDateYtd);

    const uid = roleStore.uid;
    const typeStr = type == 'sick' ? '病假' : '年假';
    const usedLeave = Object.entries(leaves).filter(([, leave]) => leave.empID == uid && leave.type == typeStr && isWithinInterval(new Date(leave.start), interval));

    const leave = type == 'sick' ? userInfo.sickLeave : userInfo.annualLeave;
    const ratio = 365 / leave;
    const workedDays = differenceInDays(yesterday, interval.start);
    const haveLeave = Math.floor(workedDays / ratio);
    const usedLeaveCount = usedLeave.length;
    const left = (type == 'sick' ? leave : haveLeave) - usedLeaveCount;
    const leftLeave = left > 0 ? left : 0;

    // last year interval
    const lastInterval = { start: new Date(interval.start), end: new Date(interval.end) };
    lastInterval.start.setFullYear(lastInterval.start.getFullYear() - 1);
    lastInterval.end.setFullYear(lastInterval.end.getFullYear() - 1);
    let lastLeftLeave = 0;
    let totalLeftLeave = leftLeave;
    if (format(lastInterval.start, 'yyyy-MM-dd') >= format(new Date(userInfo.empDate), 'yyyy-MM-dd')) {
      lastLeftLeave = Number(userInfo.lastLeftLeave ?? 0);
      totalLeftLeave = leftLeave + lastLeftLeave;
    }
    return type == 'sick' ? left : totalLeftLeave;
  };

  const getLeaveTypes = () => {
    if (userInfo.empType == 'pt') {
      leaveTypes.value.push({ title: '事假', value: '事假' });
      leaveTypes.value.push({ title: '病假', value: '病假' });
    } else {
      leaveTypes.value.push({ title: '事假', value: '事假' });
      leaveTypes.value.push({ title: `病假(尚餘 ${calcLeave('sick')} 日帶薪)`, value: '病假' });
      leaveTypes.value.push({ title: `年假(尚餘 ${calcLeave('annual')} 日)`, value: '年假' });
      leaveTypes.value.push({ title: '生日假', value: '生日假' });
      leaveTypes.value.push({ title: '產假', value: '產假' });
      leaveTypes.value.push({ title: '侍產假', value: '侍產假' });
      leaveTypes.value.push({ title: '陪審員假', value: '陪審員假' });
    }
  };

  const userInfo: UserInfoDetail = {
    engName: '',
    chnName: '',
    address: '',
    dob: '',
    email: '',
    tel: '',
    empDate: '',
    empStatus: '',
    empType: '',
    empNo: '',
    empPost: '',
    basicSalary: 0,
    compMpfRate: 0,
    staffMpfRate: 0,
    sickLeave: 0,
    annualLeave: 0,
    annualLeaveCalcDate: '',
    lastLeftLeave: 0,
  };

  const initTime = () => {
    startDate.value.setHours(9);
    startDate.value.setMinutes(30);
    startDate.value = new Date(startDate.value);
    endDate.value.setHours(18);
    endDate.value.setMinutes(30);
    endDate.value = new Date(endDate.value);
    updateDuration();
  };

  onMounted(async () => {
    window.addEventListener('resize', onResize);
    await getRoster();
    const userInfoRef = await get(dbRef(`users/info/${roleStore.uid}`));
    Object.assign(userInfo, userInfoRef.val());
    getLeaveTypes();
    initTime();
  });

  onUnmounted(() => {
    unsubscribe();
  });

  const onCancel = async (id: string) => {
    loadingStore.update(true);
    await update(dbRef(`company/leave/${id}`), { status: 'canceled' });
    loadingStore.update(false);
  };
</script>
