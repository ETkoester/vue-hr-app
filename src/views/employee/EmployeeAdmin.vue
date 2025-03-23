<template>
  <v-container class="h-full" fluid>
    <!----------- data-table ----------->
    <v-row class="p-4 items-center">
      <v-col cols="12" sm="6">
        狀態：
        <v-btn-toggle v-model="empStatus" rounded="0" group color="green-darken-4" class="inline-flex" mandatory>
          <v-btn value="1"> 在職中 </v-btn>
          <v-btn value="0"> 已離職 </v-btn>
        </v-btn-toggle>
        類型：
        <v-btn-toggle v-model="empType" rounded="0" group color="green-darken-4" class="inline-flex" mandatory>
          <v-btn value="all"> 全部 </v-btn>
          <v-btn value="ft"> 全職 </v-btn>
          <v-btn value="pt"> 兼職 </v-btn>
        </v-btn-toggle>
      </v-col>
      <v-col cols="12" sm="6" class="flex">
        <v-text-field v-model="search" label="搜尋" prepend-inner-icon="mdi-magnify" variant="outlined" hide-details clearable density="compact" />
        <v-btn density="compact" color="green-darken-4" size="large" class="ml-2 my-auto p-2" @click="onAction('create')">
          <v-icon>mdi-account-plus</v-icon>
          <span>新增員工</span>
        </v-btn>
      </v-col>
    </v-row>
    <v-data-table class="p-2 break-keep" items-per-page="-1" :headers="headers" :items="filterUsers" :search="search" item-value="name" items-per-page-text="每頁行數">
      <template #[`item.sickLeave`]="{ item }">
        <div v-if="item.raw.empType == 'ft'" @click="openSickLeave(item.raw)">
          <p>總共：{{ item.raw.sickLeave }}</p>
          <p>尚餘：{{ item.raw.sickLeaveCount }}</p>
        </div>
        <div v-else>N/A</div>
      </template>
      <template #[`item.annualLeave`]="{ item }">
        <div v-if="item.raw.empType == 'ft'" @click="openAnnualLeave(item.raw)">
          <p>總共：{{ item.raw.annualLeave }}</p>
          <p>尚餘：{{ item.raw.annualLeaveCount }}</p>
        </div>
        <div v-else>N/A</div>
      </template>
      <template #[`item.action`]="{ item }">
        <div class="hidden md:flex w-[40px]">
          <v-tooltip location="top">
            <template #activator="{ props }">
              <v-btn density="compact" color="light-blue" icon="mdi-file-edit" size="large" class="mr-2" v-bind="props" @click="onAction('edit', item.raw)" />
            </template>
            <span>編輯</span>
          </v-tooltip>
          <v-tooltip location="top">
            <template #activator="{ props }">
              <v-btn v-if="empStatus == '1'" density="compact" color="red" icon="mdi-cancel" size="large" class="mr-2" v-bind="props" @click="onAction('disable', item.raw)" />
            </template>
            <span>停用</span>
          </v-tooltip>
          <v-tooltip location="top">
            <template #activator="{ props }">
              <v-btn v-if="empStatus == '0'" density="compact" color="grey" icon="mdi-delete" size="large" class="mr-2" v-bind="props" @click="onAction('delete', item.raw)" />
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
            <!-- <v-list-item @click="onAction('view', item.raw)">
              <v-list-item-title class="flex items-center"> <v-icon icon="mdi-eye" /> 檢視 </v-list-item-title>
            </v-list-item> -->
            <v-list-item @click="onAction('edit', item.raw)">
              <v-list-item-title class="flex items-center"> <v-icon icon="mdi-file-edit" /> 編輯 </v-list-item-title>
            </v-list-item>
            <v-list-item v-if="empStatus == '1'" @click="onAction('disable', item.raw)">
              <v-list-item-title class="flex items-center"> <v-icon icon="mdi-cancel" /> 停用 </v-list-item-title>
            </v-list-item>
          </v-list>
        </v-menu>
      </template>
      <template #[`item.name`]="{ item }">
        <span class="block min-w-[55px]">{{ item.raw.chnName }}<br />{{ item.raw.engName }}</span>
      </template>
    </v-data-table>
  </v-container>

  <v-dialog v-model="empDialog" :fullscreen="windowWidth < 550" persistent :width="windowWidth < 550 ? '550' : '500'">
    <v-card>
      <v-toolbar dark color="green-darken-4">
        <v-btn icon dark @click="empDialog = false">
          <v-icon>mdi-close</v-icon>
        </v-btn>
        <v-toolbar-title>{{ action == 'create' ? '新增' : action == 'edit' ? '編輯' : '檢視' }}員工</v-toolbar-title>
        <v-spacer></v-spacer>
      </v-toolbar>
      <v-form>
        <v-stepper v-model="step" :items="stepTitles" hide-actions elevation="0">
          <template #[`item.1`]>
            <v-text-field v-model="form.email" label="電郵地址" prepend-inner-icon="mdi-email-outline" required :error-messages="v$.email.$errors.map((e) => e.$message.toString())" :readonly="action != 'create'" @blur="v$.email.$touch" />
            <v-text-field v-if="action == 'create'" v-model="form.password" label="密碼" prepend-inner-icon="mdi-key" required :error-messages="v$.password.$errors.map((e) => e.$message.toString())" @blur="v$.password.$touch" />
            <v-text-field v-model="form.chnName" label="中文名字" prepend-inner-icon="mdi-ideogram-cjk" required :error-messages="v$.chnName.$errors.map((e) => e.$message.toString())" :readonly="action == 'view'" @blur="v$.chnName.$touch" />
            <v-text-field v-model="form.engName" label="英文名字" prepend-inner-icon="mdi-format-text-variant" required :error-messages="v$.engName.$errors.map((e) => e.$message.toString())" :readonly="action == 'view'" @blur="v$.engName.$touch" />
            <v-text-field v-model="form.tel" label="電話號碼" prepend-inner-icon="mdi-phone" required :error-messages="v$.tel.$errors.map((e) => e.$message.toString())" :readonly="action == 'view'" @blur="v$.tel.$touch" />
            <v-text-field v-model="form.address" label="居住地址" prepend-inner-icon="mdi-office-building-marker" required :error-messages="v$.address.$errors.map((e) => e.$message.toString())" :readonly="action == 'view'" @blur="v$.address.$touch" />
            <vc-date-picker v-model="dobValue" mode="date" :popover="popover">
              <template #default="{ togglePopover }">
                <v-text-field v-model="form.dob" label="出生日期" prepend-inner-icon="mdi-calendar-month-outline" required :readonly="action == 'view'" @click="togglePopover" />
              </template>
            </vc-date-picker>
          </template>

          <template #[`item.2`]>
            <div class="min-h-[500px]">
              <v-text-field v-model="form.empNo" label="員工編號" prepend-inner-icon="mdi-numeric" :error-messages="v$.empNo.$errors.map((e) => e.$message.toString())" @blur="v$.address.$touch" />
              <v-text-field v-model="form.empPost" label="員工職位" prepend-inner-icon="mdi-badge-account" :error-messages="v$.empPost.$errors.map((e) => e.$message.toString())" @blur="v$.address.$touch" />
              <vc-date-picker v-model="empDateValue" mode="date" :popover="popover">
                <template #default="{ togglePopover }">
                  <v-text-field v-model="form.empDate" label="入職日期" prepend-inner-icon="mdi-calendar-month-outline" required :readonly="action == 'view'" @click="togglePopover" />
                </template>
              </vc-date-picker>
              <v-radio-group v-model="form.empType" label="類型" inline>
                <v-radio label="全職" value="ft"></v-radio>
                <v-radio label="兼職" value="pt"></v-radio>
              </v-radio-group>
            </div>
          </template>

          <template #[`item.3`]>
            <v-text-field v-model="form.basicSalary" type="number" label="基礎薪金" prepend-inner-icon="mdi-currency-usd" />
            <v-text-field v-model="form.compMpfRate" type="number" label="公司MPF" prepend-inner-icon="mdi-currency-usd" />
            <v-text-field v-model="form.staffMpfRate" type="number" label="個人MPF" prepend-inner-icon="mdi-currency-usd" />
            <v-text-field v-model="form.sickLeave" type="number" label="有薪病假數量" prepend-inner-icon="mdi-calendar-month" />
            <v-text-field v-model="form.annualLeave" type="number" label="年假數量" prepend-inner-icon="mdi-calendar-month" />
          </template>

          <v-card-actions>
            <v-btn v-if="step != 1" variant="flat" color="green-darken-4" @click="step--">上一步</v-btn>
            <v-spacer />
            <v-btn v-if="step != stepTitles.length" variant="flat" color="green-darken-4" @click="nextStep">下一步</v-btn>
            <v-btn v-if="step == stepTitles.length" variant="flat" color="green-darken-4" @click="onSubmit">提交</v-btn>
          </v-card-actions>
        </v-stepper>
      </v-form>
    </v-card>
  </v-dialog>

  <v-dialog v-model="sickLeaveDialog" :fullscreen="windowWidth < 550" persistent :width="windowWidth < 550 ? '550' : '500'">
    <v-card>
      <v-toolbar dark color="green-darken-4">
        <v-btn icon dark @click="sickLeaveDialog = false">
          <v-icon>mdi-close</v-icon>
        </v-btn>
        <v-toolbar-title>病假計算</v-toolbar-title>
        <v-spacer></v-spacer>
      </v-toolbar>
      <v-card-text>
        <p>員工：{{ leaveData.name }}</p>
        <p>計算時段：{{ format(leaveData.interval.start, 'yyyy-MM-dd') }} 至 {{ format(leaveData.interval.end, 'yyyy-MM-dd') }}</p>
        <v-form>
          <v-text-field v-model="leaveData.leave" type="number" label="有薪病假數量" prepend-inner-icon="mdi-calendar-month" />
        </v-form>
        <p>已請病假：{{ leaveData.usedLeave }}日</p>
        <p>尚餘病假：{{ leaveData.leftLeave }}日</p>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="flat" color="green-darken-4" @click="onUpdate('sick')">提交</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-dialog v-model="annualLeaveDialog" :fullscreen="windowWidth < 550" persistent :width="windowWidth < 550 ? '550' : '500'">
    <v-card>
      <v-toolbar dark color="green-darken-4">
        <v-btn icon dark @click="annualLeaveDialog = false">
          <v-icon>mdi-close</v-icon>
        </v-btn>
        <v-toolbar-title>年假計算</v-toolbar-title>
        <v-spacer></v-spacer>
      </v-toolbar>
      <v-card-text>
        <p>員工：{{ leaveData.name }}</p>
        <p>計算時段：{{ format(leaveData.interval.start, 'yyyy-MM-dd') }} 至 {{ format(leaveData.interval.end, 'yyyy-MM-dd') }}</p>
        <v-form>
          <v-text-field v-model="leaveData.leave" class="my-3" variant="outlined" type="number" label="年假數量" prepend-inner-icon="mdi-calendar-month" hide-details />
          <vc-date-picker v-model="calcDateValue" mode="date" :popover="popover">
            <template #default="{ togglePopover }">
              <v-text-field v-model="leaveData.calcDate" class="my-3" variant="outlined" label="計算日期" prepend-inner-icon="mdi-calendar-month-outline" required hide-details @click="togglePopover" />
            </template>
          </vc-date-picker>
        </v-form>
        <p>年假比例：每{{ leaveData.ratio.toFixed(1) }}日增加1日</p>
        <p>工作日數(今年)：{{ leaveData.workedDays }}日 (由 {{ format(leaveData.interval.start, 'yyyy-MM-dd') }} 至今)</p>
        <p>可請年假(今年)：{{ leaveData.haveLeave }}日</p>
        <p>已請年假(今年)：{{ leaveData.usedLeave }}日</p>
        <p>尚餘年假(今年)：{{ leaveData.leftLeave }}日</p>
        <v-text-field v-model="leaveData.lastLeftLeave" class="my-3" variant="outlined" type="number" label="上年度尚餘年假數量" prepend-inner-icon="mdi-calendar-month" hide-details />
        <p>尚餘年假(累計)：{{ leaveData.totalLeftLeave }}日</p>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="flat" color="green-darken-4" @click="onUpdate('annual')">提交</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-dialog v-model="disableDialog" persistent width="400">
    <v-card>
      <v-toolbar dark color="green-darken-4">
        <v-btn icon dark @click="disableDialog = false">
          <v-icon>mdi-close</v-icon>
        </v-btn>
        <v-toolbar-title>停用提示</v-toolbar-title>
        <v-spacer></v-spacer>
      </v-toolbar>
      <v-container>
        <v-card-text>
          <span>是否確定要停用此員工？</span>
        </v-card-text>
        <v-card-actions>
          <v-btn variant="flat" color="grey" @click="disableDialog = false">取消</v-btn>
          <v-spacer />
          <v-btn variant="flat" color="red" @click="onDisable">停用</v-btn>
        </v-card-actions>
      </v-container>
    </v-card>
  </v-dialog>

  <v-dialog v-model="deleteDialog" persistent width="400">
    <v-card>
      <v-toolbar dark color="green-darken-4">
        <v-btn icon dark @click="deleteDialog = false">
          <v-icon>mdi-close</v-icon>
        </v-btn>
        <v-toolbar-title>刪除提示</v-toolbar-title>
        <v-spacer></v-spacer>
      </v-toolbar>
      <v-container>
        <v-card-text>
          <span>是否確定要刪除此員工？</span>
        </v-card-text>
        <v-card-actions>
          <v-btn variant="flat" color="grey" @click="deleteDialog = false">取消</v-btn>
          <v-spacer />
          <v-btn variant="flat" color="red" @click="onDelete">刪除</v-btn>
        </v-card-actions>
      </v-container>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
  import { auth, dbRef } from '@/firebase';
  import { useLoadingStore } from '@/store/loading';
  import { useMessageStore } from '@/store/message';
  import { ApprovalDetail, UserInfoDetail } from '@/types';
  import { useVuelidate } from '@vuelidate/core';
  import { email, helpers, required } from '@vuelidate/validators';
  import { differenceInDays, format, isWithinInterval } from 'date-fns';
  import { equalTo, get, orderByChild, query, remove, set, update } from 'firebase/database';
  import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue';

  const loadingStore = useLoadingStore();
  const messageStore = useMessageStore();

  const popover = ref({
    visibility: 'click',
    placement: 'bottom',
  });

  const headers = [
    { title: '員工', key: 'name' },
    { title: '郵箱', key: 'email' },
    { title: '電話', key: 'tel' },
    { title: '入職日期', key: 'empDate' },
    { title: '病假', key: 'sickLeave' },
    { title: '年假', key: 'annualLeave' },
    { title: '操作', key: 'action', sortable: false },
  ];

  const step = ref(1);
  const stepTitles = ['個人資料', '工作資料', '薪金相關'];

  const initForm = {
    email: '',
    password: null,
    chnName: '',
    engName: '',
    tel: '',
    address: '',
    dob: computed(() => format(dobValue.value, 'yyyy-MM-dd')),
    empDate: computed(() => format(empDateValue.value, 'yyyy-MM-dd')),
    empStatus: '1',
    empType: 'ft',
    empPost: '',
    empNo: '001',
    basicSalary: 10000,
    compMpfRate: 0.05,
    staffMpfRate: 0.05,
    sickLeave: 5,
    annualLeave: 10,
    annualLeaveCalcDate: '',
    lastLeftLeave: 0,
  };

  const dobValue = ref(new Date());
  const empDateValue = ref(new Date());
  const calcDateValue = ref(new Date());

  const form = reactive({ ...initForm });

  const initLeaveData = {
    uid: '',
    name: '',
    interval: { start: new Date(), end: new Date() },
    calcDate: computed(() => format(calcDateValue.value, 'MM-dd')),
    leave: 0,
    ratio: 0,
    workedDays: 0,
    haveLeave: 0,
    usedLeave: 0,
    leftLeave: 0,
    lastLeftLeave: 0,
    totalLeftLeave: 0,
  };
  const leaveData = reactive({ ...initLeaveData });

  const requiredPassword = () => action.value != 'create' || form.password != null;

  const empNoExist = (value: string) => action.value != 'create' || !empNoList.includes(value);
  const emailExist = (value: string) => action.value != 'create' || !emailList.includes(value);

  const rules = {
    email: { required: helpers.withMessage('請輸入電郵地址', required), email: helpers.withMessage('請輸入有效的電郵地址', email), exist: helpers.withMessage('電郵已被註冊', emailExist) },
    password: { required: helpers.withMessage('請輸入密碼', requiredPassword) },
    chnName: { required: helpers.withMessage('請輸入中文名字', required) },
    engName: { required: helpers.withMessage('請輸入英文名字', required) },
    tel: { required: helpers.withMessage('請輸入電話號碼', required) },
    address: { required: helpers.withMessage('請輸入居住地址', required) },
    empNo: { required: helpers.withMessage('請輸入員工編號', required), exist: helpers.withMessage('員工編號已存在', empNoExist) },
    empPost: { required: helpers.withMessage('請輸入員工職位', required) },
  };

  const v$ = useVuelidate(rules, form);

  const search = ref();
  const action = ref('');
  const empStatus = ref('1');
  const empType = ref('all');

  const empDialog = ref(false);
  const disableDialog = ref(false);
  const deleteDialog = ref(false);
  const sickLeaveDialog = ref(false);
  const annualLeaveDialog = ref(false);
  let actionID = '';

  interface User extends UserInfoDetail {
    uid: string;
    sickLeaveCount: number;
    annualLeaveCount: number;
  }

  const users = reactive<User[]>([]);
  const empNoList: string[] = [];
  const emailList: string[] = [];

  const getUsers = async () => {
    const userInfo = await get(dbRef('users/info'));
    if (userInfo.val() == undefined) return;
    users.length = 0;
    Object.entries(userInfo.val()).forEach(([id, value]) => {
      const info = value as UserInfoDetail;
      const user = { uid: id, ...info, sickLeaveCount: 0, annualLeaveCount: 0 };
      user.sickLeaveCount = calcLeave(user, 'sick');
      user.annualLeaveCount = calcLeave(user, 'annual');
      users.push(user);
      empNoList.push(info.empNo);
      emailList.push(info.email);
    });
  };

  const leaves = reactive<ApprovalDetail[]>([]);

  const getLeaves = async () => {
    const leaveRef = await get(query(dbRef('company/leave'), orderByChild('status'), equalTo('approved')));
    if (leaveRef.val() == undefined) return;
    Object.entries(leaveRef.val()).forEach(([, value]) => {
      const leave = value as ApprovalDetail;
      if (leave.type == '病假' || leave.type == '年假') {
        leaves.push(leave);
      }
    });
  };

  const calcLeave = (user: User, type: string): number => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const thisYear = yesterday.getFullYear();
    let calcDate = (type == 'sick' ? user.empDate?.slice(5, 10) : user.annualLeaveCalcDate) ?? '01-01';
    const beforeCalcDate = format(yesterday, 'MM-dd') < calcDate;

    // current year interval
    const interval = { start: new Date(), end: new Date() };
    if (beforeCalcDate) interval.start = new Date(`${thisYear - 1}-${calcDate}`);
    else interval.start = new Date(`${thisYear}-${calcDate}`);
    const calcDateYtd = new Date(interval.start);
    calcDateYtd.setFullYear(calcDateYtd.getFullYear() + 1);
    calcDateYtd.setDate(calcDateYtd.getDate() - 1);
    interval.end = new Date(calcDateYtd);

    calcDateValue.value = new Date(interval.start.getTime());

    const typeStr = type == 'sick' ? '病假' : '年假';
    const usedLeave = leaves.filter((leave) => leave.empID == user.uid && leave.type == typeStr && isWithinInterval(new Date(leave.start), interval));

    leaveData.uid = user.uid;
    leaveData.name = `${user.chnName} ${user.engName}`;
    leaveData.interval = interval;
    leaveData.leave = type == 'sick' ? user.sickLeave : user.annualLeave;
    leaveData.ratio = 365 / leaveData.leave;
    leaveData.workedDays = differenceInDays(yesterday, interval.start);
    leaveData.haveLeave = Math.floor(leaveData.workedDays / leaveData.ratio);
    leaveData.usedLeave = usedLeave.length;
    const left = (type == 'sick' ? leaveData.leave : leaveData.haveLeave) - leaveData.usedLeave;
    leaveData.leftLeave = left > 0 ? left : 0;

    // last year interval
    const lastInterval = { start: new Date(interval.start), end: new Date(interval.end) };
    lastInterval.start.setFullYear(lastInterval.start.getFullYear() - 1);
    lastInterval.end.setFullYear(lastInterval.end.getFullYear() - 1);
    leaveData.lastLeftLeave = 0;
    leaveData.totalLeftLeave = leaveData.leftLeave;
    if (format(lastInterval.start, 'yyyy-MM-dd') >= format(new Date(user.empDate), 'yyyy-MM-dd')) {
      leaveData.lastLeftLeave = Number(user.lastLeftLeave ?? 0);
      leaveData.totalLeftLeave = leaveData.leftLeave + leaveData.lastLeftLeave;
    }
    return type == 'sick' ? left : leaveData.totalLeftLeave;
  };

  const openSickLeave = (user: User) => {
    calcLeave(user, 'sick');
    sickLeaveDialog.value = true;
  };

  const openAnnualLeave = (user: User) => {
    calcLeave(user, 'annual');
    annualLeaveDialog.value = true;
  };

  const onAction = (act: string, user?: User) => {
    action.value = act;
    v$.value.$reset();
    Object.assign(form, initForm);
    step.value = 1;
    if (act == 'create') {
      empDateValue.value = new Date();
      dobValue.value = new Date('2000-01-01');
      empDialog.value = true;
      return;
    }

    if (user == undefined) return;
    actionID = user.uid;

    if (act == 'disable') {
      disableDialog.value = true;
    } else if (act == 'delete') {
      deleteDialog.value = true;
    } else {
      form.email = user.email;
      form.chnName = user.chnName;
      form.engName = user.engName;
      form.address = user.address;
      form.tel = user.tel;
      dobValue.value = new Date(user.dob);
      empDateValue.value = new Date(user.empDate);
      form.empType = user.empType;
      form.empNo = user.empNo;
      form.empPost = user.empPost;
      form.basicSalary = user.basicSalary;
      form.compMpfRate = user.compMpfRate;
      form.staffMpfRate = user.staffMpfRate;
      form.sickLeave = user.sickLeave;
      form.annualLeave = user.annualLeave;
      form.annualLeaveCalcDate = user.annualLeaveCalcDate;
      empDialog.value = true;
    }
  };

  const onDisable = async () => {
    loadingStore.update(true);
    await update(dbRef(`users/info/${actionID}`), { empStatus: '0' });
    await getUsers();
    disableDialog.value = false;
    loadingStore.update(false);
  };

  const useFunction = (func: string) => {
    return `https://xxxxxxxxxxxxxxxxx.cloudfunctions.net/${func}`;
  };

  const onDelete = async () => {
    loadingStore.update(true);
    await postData(useFunction('app/deleteUser'), { uid: actionID });
    await remove(dbRef(`users/attendance/${actionID}`));
    await remove(dbRef(`users/chats/${actionID}`));
    await remove(dbRef(`users/info/${actionID}`));
    await remove(dbRef(`users/role/${actionID}`));
    await remove(dbRef(`users/roster/${actionID}`));
    await remove(dbRef(`users/salary/${actionID}`));
    await remove(dbRef(`users/todo/${actionID}`));
    await getUsers();
    deleteDialog.value = false;
    loadingStore.update(false);
  };

  const postData = async (url: string, data: object) => {
    const idToken = await auth.currentUser?.getIdToken(true);
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
        accept: 'application/json',
      },
      body: JSON.stringify(data),
    });
    return response.json();
  };

  const nextStep = async () => {
    let valid = true;
    if (step.value == 1) {
      valid = (await v$.value.email.$validate()) && valid;
      valid = (await v$.value.password.$validate()) && valid;
      valid = (await v$.value.chnName.$validate()) && valid;
      valid = (await v$.value.engName.$validate()) && valid;
      valid = (await v$.value.tel.$validate()) && valid;
      valid = (await v$.value.address.$validate()) && valid;
    }
    if (step.value == 2) {
      valid = (await v$.value.empNo.$validate()) && valid;
      valid = (await v$.value.empPost.$validate()) && valid;
    }
    if (valid) step.value++;
  };

  const onSubmit = async () => {
    const valid = await v$.value.$validate();
    if (!valid) return;
    loadingStore.update(true);
    if (action.value == 'edit') {
      await update(dbRef(`users/info/${actionID}`), form);
      messageStore.showMessage('成功修改員工資料');
    }
    if (action.value == 'create') {
      const user = await postData(useFunction('app/createUser'), { email: form.email, password: form.password });
      if (!user.uid) {
        if (user.details.code == 'auth/email-already-exists') {
          messageStore.showMessage('該電郵地址已被註冊', 'error');
        } else {
          messageStore.showMessage('新增員工失敗', 'error');
        }
      } else {
        form.annualLeaveCalcDate = form.empDate.slice(5, 10);
        await set(dbRef(`users/role/${user.uid}`), 'user');
        await set(dbRef(`users/info/${user.uid}`), form);
      }
    }
    await getUsers();
    empDialog.value = false;
    loadingStore.update(false);
  };

  const onUpdate = async (type: string) => {
    if (type == 'sick') {
      await update(dbRef(`users/info/${leaveData.uid}`), { sickLeave: leaveData.leave });
      sickLeaveDialog.value = false;
    } else {
      await update(dbRef(`users/info/${leaveData.uid}`), { annualLeave: leaveData.leave, annualLeaveCalcDate: leaveData.calcDate, lastLeftLeave: leaveData.lastLeftLeave });
      annualLeaveDialog.value = false;
    }
    await getUsers();
  };

  const windowWidth = ref(window.innerWidth);

  onBeforeUnmount(() => {
    window.removeEventListener('resize', onResize);
  });

  const onResize = () => {
    windowWidth.value = window.innerWidth;
  };

  const filterUsers = computed(() => users.filter((e) => e.empStatus == empStatus.value && (empType.value == 'all' || e.empType == empType.value)));

  onMounted(async () => {
    loadingStore.update(true);
    window.addEventListener('resize', onResize);
    await getLeaves();
    await getUsers();
    loadingStore.update(false);
  });
</script>
