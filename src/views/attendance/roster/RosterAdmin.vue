<template>
  <v-container class="h-full" fluid>
    <div class="mb-4 flex !overflow-x-auto items-center w-full">
      <span class="min-w-fit">班次：</span>
      <div class="flex whitespace-nowrap">
        <v-chip class="mr-2" color="blue" @click="openShiftDialog('add')">新增</v-chip>
        <v-chip v-for="(shift, id, index) in shifts" :key="id" class="mr-2" :color="colors[index % colors.length]" @click="openShiftDialog('edit', { id: id.toString(), ...shift })">
          {{ `${shift.name}: ${shift.start} - ${shift.end}` }}
        </v-chip>
      </div>
    </div>
    <div class="mb-4 flex !overflow-x-auto items-center w-full">
      <span class="min-w-fit">週期：</span>
      <div class="flex whitespace-nowrap">
        <v-chip class="mr-2" color="blue" @click="openPeriodDialog('add')">新增</v-chip>
        <v-chip v-for="(period, id, index) in periods" :key="id" class="mr-2" :color="colors[index % colors.length]" @click="openPeriodDialog('edit', { id: id.toString(), ...period })">
          {{ `${period.name}` }}
        </v-chip>
      </div>
    </div>
    <v-text-field v-model="month" type="month" label="月份" class="inline-block max-w-[200px] align-bottom mb-3 mr-4" density="compact" variant="outlined" hide-details @update:model-value="updateHeader" />
    <v-text-field v-model="search" label="搜尋員工" class="inline-block min-w-[200px] align-bottom mb-3 mr-4" density="compact" variant="outlined" hide-details />
    <v-btn-toggle v-model="empType" rounded="0" group color="green-darken-4" class="inline-flex mb-3 mr-4" mandatory>
      <v-btn value="all"> 全部 </v-btn>
      <v-btn value="ft"> 全職 </v-btn>
      <v-btn value="pt"> 兼職 </v-btn>
    </v-btn-toggle>
    <v-btn density="compact" color="green-darken-4" type="text" size="large" class="mb-3 mr-2" @click="autoRosterDialog = true">
      <v-icon>mdi-list-box-outline</v-icon>
      全職排班
    </v-btn>

    <v-data-table :headers="headers" :items="filterUsers" :search="search" height="65vh" fixed-header items-per-page="-1">
      <template #headers="{ columns }">
        <tr>
          <th class="text-center sticky left-0 bg-[var(--v-theme-surface)]">
            <span>員工</span>
          </th>
          <template v-for="column in columns.slice(1)" :key="column.key">
            <th class="text-center">
              <span class="whitespace-pre-line" :class="['六', '日'].includes(column.title.slice(-1)) || monthHolidays.includes(column.key) ? 'text-red' : ''">
                {{ column.title }}
              </span>
            </th>
          </template>
        </tr>
      </template>
      <template #item="{ item }">
        <tr class="text-center">
          <td class="border sticky left-0 bg-[var(--v-theme-surface)] min-w-[100px] z-[1]">
            <span class="whitespace-pre-line">{{ item.raw.name }}</span>
          </td>
          <template v-for="(header, index) in headers.slice(1)" :key="index">
            <td class="!p-2 border w-[80px]" @click="openRosterDialog(item.raw, header.key)">
              <template v-if="item.raw.roster[header.key] != null">
                <v-chip v-if="item.raw.roster[header.key].shift == 'leaveBefore'" density="comfortable" color="orange">
                  {{ item.raw.roster[header.key].leaveType }}
                </v-chip>
                <v-chip density="comfortable" :color="getChipColor(item.raw.roster[header.key].shift)">
                  {{ getChipName(item.raw.roster[header.key]) }}
                </v-chip>
                <v-chip v-if="!['rest', 'leaveFull'].includes(item.raw.roster[header.key].shift)" class="mt-1" density="comfortable" color="blue">
                  {{ item.raw.roster[header.key].end }}
                </v-chip>
                <v-chip v-if="item.raw.roster[header.key].shift == 'leaveAfter'" density="comfortable" color="orange">
                  {{ item.raw.roster[header.key].leaveType }}
                </v-chip>
              </template>
            </td>
          </template>
        </tr>
      </template>
    </v-data-table>
  </v-container>

  <v-dialog v-model="shiftDialog" :fullscreen="windowWidth < 550" persistent :width="windowWidth < 550 ? '550' : '500'">
    <v-card>
      <v-toolbar dark color="green-darken-4">
        <v-btn icon dark @click="shiftDialog = false">
          <v-icon>mdi-close</v-icon>
        </v-btn>
        <v-toolbar-title>{{ `${shiftAction == 'add' ? '新增' : '編輯'}班次` }}</v-toolbar-title>
        <v-spacer></v-spacer>
      </v-toolbar>
      <v-container>
        <v-form>
          <v-text-field v-model="shiftForm.name" label="班次名稱" />
          <v-text-field v-model="shiftForm.start" label="上班時間" type="time" />
          <v-text-field v-model="shiftForm.end" label="下班時間" type="time" />
        </v-form>
        <v-card-actions>
          <v-btn v-if="shiftAction == 'edit'" variant="flat" color="red" @click="submitShift('delete')">刪除</v-btn>
          <v-spacer />
          <v-btn variant="flat" color="green-darken-4" @click="submitShift(shiftAction)">{{ shiftAction == 'edit' ? '更新' : '新增' }}</v-btn>
        </v-card-actions>
      </v-container>
    </v-card>
  </v-dialog>

  <v-dialog v-model="periodDialog" :fullscreen="windowWidth < 550" persistent :width="windowWidth < 550 ? '550' : '500'">
    <v-card>
      <v-toolbar dark color="green-darken-4">
        <v-btn icon dark @click="periodDialog = false">
          <v-icon>mdi-close</v-icon>
        </v-btn>
        <v-toolbar-title>{{ `${periodAction == 'add' ? '新增' : '編輯'}週期` }}</v-toolbar-title>
        <v-spacer></v-spacer>
      </v-toolbar>
      <v-container>
        <v-form>
          <v-text-field v-model="periodForm.name" label="週期名稱" />
          <v-select v-model="periodForm[0]" label="星期日" :items="shiftSelect" item-title="name" item-value="id" />
          <v-select v-model="periodForm[1]" label="星期一" :items="shiftSelect" item-title="name" item-value="id" />
          <v-select v-model="periodForm[2]" label="星期二" :items="shiftSelect" item-title="name" item-value="id" />
          <v-select v-model="periodForm[3]" label="星期三" :items="shiftSelect" item-title="name" item-value="id" />
          <v-select v-model="periodForm[4]" label="星期四" :items="shiftSelect" item-title="name" item-value="id" />
          <v-select v-model="periodForm[5]" label="星期五" :items="shiftSelect" item-title="name" item-value="id" />
          <v-select v-model="periodForm[6]" label="星期六" :items="shiftSelect" item-title="name" item-value="id" />
          <v-checkbox v-model="periodForm.publicHoliday" label="公眾假期放假" hide-details density="compact" />
        </v-form>
        <v-card-actions>
          <v-btn v-if="periodAction == 'edit'" variant="flat" color="red" @click="submitPeriod('delete')">刪除</v-btn>
          <v-spacer />
          <v-btn variant="flat" color="green-darken-4" @click="submitPeriod(periodAction)">{{ periodAction == 'edit' ? '更新' : '新增' }}</v-btn>
        </v-card-actions>
      </v-container>
    </v-card>
  </v-dialog>

  <v-dialog v-model="rosterDialog" :fullscreen="windowWidth < 550" persistent :width="windowWidth < 550 ? '550' : '500'">
    <v-card>
      <v-toolbar dark color="green-darken-4">
        <v-btn icon dark @click="rosterDialog = false">
          <v-icon>mdi-close</v-icon>
        </v-btn>
        <v-toolbar-title>員工排班</v-toolbar-title>
        <v-spacer></v-spacer>
      </v-toolbar>
      <v-container>
        <v-card-text>
          <p class="pb-3">{{ `員工：${rosterForm.name}` }}<br />{{ `日期：${rosterForm.date}` }}</p>
          <v-tabs v-model="rosterForm.type" fixed-tabs bg-color="green-darken-4" slider-color="teal-lighten-3">
            <v-tab value="day">按日子排班</v-tab>
            <v-tab value="period">按週期排班</v-tab>
          </v-tabs>
          <v-window v-model="rosterForm.type" class="pt-5">
            <v-form>
              <v-window-item value="day">
                <v-select v-model="rosterForm.shift" label="班次" :items="shiftSelect" item-title="name" item-value="id" />
                <v-select v-if="rosterForm.shift.startsWith('leave')" v-model="rosterForm.leaveType" label="請假類型" :items="['事假', '病假', '年假', '生日假', '產假', '陪產假', '婚假', '喪假', '哺乳假', '其他']" />
                <template v-if="['custom', 'leaveBefore', 'leaveAfter'].includes(rosterForm.shift)">
                  <v-text-field v-model="rosterForm.start" label="上班時間" type="time" />
                  <v-text-field v-model="rosterForm.end" label="下班時間" type="time" />
                </template>
                <v-list v-else-if="rosterForm.shift != 'rest' && rosterForm.shift != 'leaveFull'" density="compact">
                  <v-list-item>上班時間：{{ shifts[rosterForm.shift]?.start }}</v-list-item>
                  <v-list-item>下班時間：{{ shifts[rosterForm.shift]?.end }}</v-list-item>
                </v-list>
              </v-window-item>
              <v-window-item value="period">
                <p>從本日開始按此週期排班至月底</p>
                <v-select v-model="rosterForm.period" label="週期" :items="periodSelect" item-title="name" item-value="id" />
                <v-list v-if="rosterForm.period" density="compact">
                  <v-list-item>星期日：{{ displayShift(periods[rosterForm.period][0]) }}</v-list-item>
                  <v-list-item>星期一：{{ displayShift(periods[rosterForm.period][1]) }}</v-list-item>
                  <v-list-item>星期二：{{ displayShift(periods[rosterForm.period][2]) }}</v-list-item>
                  <v-list-item>星期三：{{ displayShift(periods[rosterForm.period][3]) }}</v-list-item>
                  <v-list-item>星期四：{{ displayShift(periods[rosterForm.period][4]) }}</v-list-item>
                  <v-list-item>星期五：{{ displayShift(periods[rosterForm.period][5]) }}</v-list-item>
                  <v-list-item>星期六：{{ displayShift(periods[rosterForm.period][6]) }}</v-list-item>
                </v-list>
              </v-window-item>
            </v-form>
          </v-window>
        </v-card-text>
        <v-card-actions>
          <v-btn variant="flat" color="red" @click="submitRoster('delete')">刪除</v-btn>
          <v-spacer />
          <v-btn variant="flat" color="green-darken-4" @click="submitRoster('edit')">確定</v-btn>
        </v-card-actions>
      </v-container>
    </v-card>
  </v-dialog>

  <v-dialog v-model="autoRosterDialog" :fullscreen="windowWidth < 550" persistent :width="windowWidth < 550 ? '550' : '500'">
    <v-card>
      <v-toolbar dark color="green-darken-4">
        <v-btn icon dark @click="autoRosterDialog = false">
          <v-icon>mdi-close</v-icon>
        </v-btn>
        <v-toolbar-title>全職排班</v-toolbar-title>
        <v-spacer></v-spacer>
      </v-toolbar>
      <v-container>
        <v-card-text>
          <v-form>
            <p>所有全職員工按此週期排班</p>
            <v-select v-model="rosterForm.period" label="週期" :items="periodSelect" item-title="name" item-value="id" />
            <v-list v-if="rosterForm.period" density="compact">
              <v-list-item>星期日：{{ displayShift(periods[rosterForm.period][0]) }}</v-list-item>
              <v-list-item>星期一：{{ displayShift(periods[rosterForm.period][1]) }}</v-list-item>
              <v-list-item>星期二：{{ displayShift(periods[rosterForm.period][2]) }}</v-list-item>
              <v-list-item>星期三：{{ displayShift(periods[rosterForm.period][3]) }}</v-list-item>
              <v-list-item>星期四：{{ displayShift(periods[rosterForm.period][4]) }}</v-list-item>
              <v-list-item>星期五：{{ displayShift(periods[rosterForm.period][5]) }}</v-list-item>
              <v-list-item>星期六：{{ displayShift(periods[rosterForm.period][6]) }}</v-list-item>
            </v-list>
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="flat" color="green-darken-4" @click="submitAutoRoster()">確定</v-btn>
        </v-card-actions>
      </v-container>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
  import { dbRef } from '@/firebase';
  import { useLoadingStore } from '@/store/loading';
  import { ApprovalDetail, Period, PeriodDetailWithId, PeriodWeek, Roster, RosterDetail, Shift, ShiftDetailWithId, UserInfoDetail, UserRoster } from '@/types';
  import Holidays from 'date-holidays';
  import { equalTo, get, orderByChild, push, query, remove, set, update } from 'firebase/database';
  import { computed } from 'vue';
  import { onBeforeMount, onMounted, reactive, ref } from 'vue';

  const windowWidth = ref(window.innerWidth);

  onBeforeMount(() => {
    window.removeEventListener('resize', onResize);
  });

  const onResize = () => {
    windowWidth.value = window.innerWidth;
  };

  const loadingStore = useLoadingStore();

  onMounted(async () => {
    window.addEventListener('resize', onResize);
    await getShifts();
    await getPeriods();
    await getRosters();
    await getUsers();
    await getLeaves();
    updateHeader();
  });

  const month = ref(new Date().toISOString().slice(0, 7));
  const weekLabel = ['日', '一', '二', '三', '四', '五', '六'];
  const holidays = new Holidays('HK');
  const monthHolidays = ref<string[]>([]);

  const headers = reactive<{ title: string; key: string }[]>([{ title: '員工', key: 'name' }]);
  const updateHeader = () => {
    const date = new Date(month.value);
    const currentMonth = date.getMonth();
    monthHolidays.value = holidays
      .getHolidays(date.getFullYear())
      .filter((hd) => hd.date.slice(0, 7) == month.value)
      .map((hd) => hd.date.slice(0, 10));
    headers.length = 1;
    for (date; date.getMonth() == currentMonth; date.setDate(date.getDate() + 1)) {
      const formattedDate = date.toISOString().slice(0, 10);
      headers.push({
        title: `${date.getDate()}\n${weekLabel[date.getDay()]}`,
        key: formattedDate,
      });
      users.value.forEach((user) => {
        const leave = leaves.filter((leave) => leave.empID == user.id && leave.start.startsWith(formattedDate))?.[0];
        if (leave == undefined) return;
        const roster = user.roster[formattedDate] ?? {};
        const leaveStart = leave?.start.split(' ')[1];
        const leaveEnd = leave?.end.split(' ')[1];
        if (roster.start < leaveStart) {
          roster.shift = 'leaveAfter';
          roster.end = leaveStart;
        } else if (roster.end > leaveEnd) {
          roster.shift = 'leaveBefore';
          roster.start = leaveEnd;
        } else {
          roster.shift = 'leaveFull';
          roster.start = '';
          roster.end = '';
        }
        roster.leaveType = leave.type;
        user.roster[formattedDate] = roster;
      });
    }
  };

  const colors = ['red', 'green', 'purple', 'orange'];
  const empType = ref('all');

  const search = ref('');
  interface UserWithRoster {
    id: string;
    name: string;
    empType: string;
    roster: Roster;
  }
  const users = ref<UserWithRoster[]>([]);

  const filterUsers = computed(() => users.value.filter((user) => user.empType == empType.value || empType.value == 'all'));

  const getUsers = async () => {
    const userInfo = await get(query(dbRef('users/info'), orderByChild('empStatus'), equalTo('1')));
    Object.entries(userInfo.val()).forEach(([id, value]) => {
      const user = value as UserInfoDetail;
      users.value.push({
        id: id,
        name: `${user.chnName}\n${user.engName}`,
        empType: user.empType,
        roster: rosters[id] || {},
      });
    });
  };

  const rosters = reactive<UserRoster>({});
  const rosterDialog = ref(false);
  const initialRoster = {
    uid: '',
    name: '',
    date: '',
    type: 'day',
    shift: 'rest',
    leaveType: '事假',
    start: '',
    end: '',
    period: '',
  };
  const rosterForm = reactive({ ...initialRoster });

  const getRosters = async () => {
    await get(dbRef('users/roster')).then((snapshot) => {
      if (snapshot.val()) {
        Object.keys(rosters).forEach((key) => {
          delete rosters[key];
        });
        Object.assign(rosters, snapshot.val());
      }
    });
  };

  const openRosterDialog = (user: UserWithRoster, date: string) => {
    Object.assign(rosterForm, initialRoster);
    rosterForm.uid = user.id;
    rosterForm.name = user.name;
    rosterForm.date = date;
    const roster = user.roster[date];
    rosterForm.shift = roster?.shift ?? 'rest';
    rosterForm.leaveType = roster?.leaveType ?? '事假';
    rosterForm.start = roster?.start ?? '00:00';
    rosterForm.end = roster?.end ?? '00:00';
    shiftSelect.value.length = 0;
    shiftSelect.value.push({ id: 'rest', name: '休息', start: '', end: '' });
    shiftSelect.value.push({ id: 'custom', name: '自訂', start: '', end: '' });
    // shiftSelect.value.push({ id: 'leaveFull', name: '全日假', start: '', end: '' });
    // shiftSelect.value.push({ id: 'leaveBefore', name: '上午假', start: '', end: '' });
    // shiftSelect.value.push({ id: 'leaveAfter', name: '下午假', start: '', end: '' });
    Object.entries(shifts).map(([id, value]) => shiftSelect.value.push({ id, ...value }));
    rosterDialog.value = true;
  };

  const submitRoster = async (action: string) => {
    if (action == 'delete') {
      await remove(dbRef(`users/roster/${rosterForm.uid}/${rosterForm.date}`));
    }
    if (action == 'edit') {
      if (rosterForm.type == 'day') {
        const shift = shifts[rosterForm.shift] ?? {};
        let updateShift: RosterDetail = { shift: rosterForm.shift, start: shift.start ?? '', end: shift.end ?? '' };
        if (['custom', 'leaveBefore', 'leaveAfter'].includes(rosterForm.shift)) {
          updateShift.start = rosterForm.start;
          updateShift.end = rosterForm.end;
        }
        if (rosterForm.shift.startsWith('leave')) {
          updateShift.leaveType = rosterForm.leaveType;
        }
        await set(dbRef(`users/roster/${rosterForm.uid}/${rosterForm.date}`), updateShift);
      }
      if (rosterForm.type == 'period') {
        const date = new Date(rosterForm.date);
        const currentMonth = date.getMonth();
        let roster: Roster = {};
        for (date; date.getMonth() == currentMonth; date.setDate(date.getDate() + 1)) {
          const formattedDate = date.toISOString().slice(0, 10);
          const period = periods[rosterForm.period];
          const shift = period.publicHoliday && monthHolidays.value.includes(formattedDate) ? 'rest' : period[date.getDay() as keyof PeriodWeek];
          if (shift == 'null') continue;
          const shiftDetail = shifts[shift] ?? {};
          roster[formattedDate] = { shift: shift, start: shiftDetail.start ?? '', end: shiftDetail.end ?? '' };
        }
        await update(dbRef(`users/roster/${rosterForm.uid}`), roster);
      }
    }
    await getRosters();
    users.value.forEach((user) => {
      user.roster = rosters[user.id] || {};
    });
    updateHeader();
    rosterDialog.value = false;
  };

  const shifts = reactive<Shift>({});
  const initialShift: ShiftDetailWithId = {
    id: '',
    name: '',
    start: '00:30',
    end: '00:30',
  };
  const shiftForm = reactive({ ...initialShift });
  const shiftDialog = ref(false);
  const shiftAction = ref('');
  const shiftSelect = ref<ShiftDetailWithId[]>([]);

  const getShifts = async () => {
    Object.keys(shifts).forEach((key) => {
      delete shifts[key];
    });
    const shiftRef = await get(dbRef('company/shifts'));
    if (shiftRef.val() == undefined) return;
    Object.assign(shifts, shiftRef.val());
  };

  const displayShift = (shiftID: string) => {
    if (shiftID == null) return '';
    if (shiftID == 'null') return 'N/A';
    if (shiftID == 'rest') return '休息';
    return `${shifts[shiftID].start} - ${shifts[shiftID].end}`;
  };

  const openShiftDialog = (action: string, shift?: ShiftDetailWithId) => {
    shiftAction.value = action;
    Object.assign(shiftForm, action == 'add' ? initialShift : shift);
    shiftDialog.value = true;
  };

  const submitShift = async (action: string) => {
    const shiftId = shiftForm.id;
    delete shiftForm.id;

    switch (action) {
      case 'add':
        await push(dbRef('company/shifts'), shiftForm);
        break;
      case 'edit':
        await set(dbRef(`company/shifts/${shiftId}`), shiftForm);
        break;
      case 'delete':
        await remove(dbRef(`company/shifts/${shiftId}`));
        break;
    }
    await getShifts();
    shiftDialog.value = false;
  };

  const periods = reactive<Period>({});
  const initialPeriod: PeriodDetailWithId = {
    id: '',
    name: '',
    publicHoliday: false,
    0: '',
    1: '',
    2: '',
    3: '',
    4: '',
    5: '',
    6: '',
  };
  const periodForm = reactive({ ...initialPeriod });
  const periodDialog = ref(false);
  const periodAction = ref('');
  const periodSelect = ref<PeriodDetailWithId[]>([]);

  const getPeriods = async () => {
    await get(dbRef('company/periods')).then((snapshot) => {
      if (snapshot.val()) {
        Object.keys(periods).forEach((key) => {
          delete periods[key];
        });
        Object.assign(periods, snapshot.val());
      }
    });
    periodSelect.value = Object.entries(periods).map(([id, value]) => ({ id, ...value }));
  };

  const openPeriodDialog = (action: string, period?: PeriodDetailWithId) => {
    periodAction.value = action;
    Object.assign(periodForm, action == 'add' ? initialPeriod : period);
    shiftSelect.value.length = 0;
    shiftSelect.value.push({ id: 'null', name: 'N/A', start: '', end: '' });
    shiftSelect.value.push({ id: 'rest', name: '休息', start: '', end: '' });
    Object.entries(shifts).map(([id, value]) => shiftSelect.value.push({ id, ...value }));
    periodDialog.value = true;
  };

  const submitPeriod = async (action: string) => {
    const periodId = periodForm.id;
    delete periodForm.id;
    switch (action) {
      case 'add':
        await push(dbRef('company/periods'), periodForm);
        break;
      case 'edit':
        await set(dbRef(`company/periods/${periodId}`), periodForm);
        break;
      case 'delete':
        await remove(dbRef(`company/periods/${periodId}`));
        break;
    }
    await getPeriods();
    periodDialog.value = false;
  };

  const leaves = reactive<ApprovalDetail[]>([]);

  const getLeaves = async () => {
    const leavesRef = await get(query(dbRef(`company/leave`), orderByChild('status'), equalTo('approved')));
    Object.entries(leavesRef.val()).forEach(([, value]) => {
      leaves.push(value as ApprovalDetail);
    });
  };

  const getChipColor = (shift: string) => {
    if (shift == 'rest') return 'grey';
    if (shift == 'leaveFull') return 'orange';
    return 'red';
  };

  const getChipName = (roster: RosterDetail) => {
    if (roster.shift == 'rest') return '休息';
    if (roster.shift == 'leaveFull') return roster.leaveType;
    return roster.start;
  };

  const autoRosterDialog = ref(false);

  const submitAutoRoster = async () => {
    loadingStore.update(true);
    const date = new Date(month.value);
    const currentMonth = date.getMonth();
    let roster: Roster = {};
    for (date; date.getMonth() == currentMonth; date.setDate(date.getDate() + 1)) {
      const formattedDate = date.toISOString().slice(0, 10);
      const period = periods[rosterForm.period];
      const shift = period.publicHoliday && monthHolidays.value.includes(formattedDate) ? 'rest' : period[date.getDay() as keyof PeriodWeek];
      if (shift == 'null') continue;
      const shiftDetail = shifts[shift] ?? {};
      roster[formattedDate] = { shift: shift, start: shiftDetail.start ?? '', end: shiftDetail.end ?? '' };
    }

    for (const user of users.value) {
      if (user.empType == 'ft') {
        await update(dbRef(`users/roster/${user.id}`), roster);
      }
    }

    await getRosters();
    users.value.forEach((user) => {
      user.roster = rosters[user.id] || {};
    });
    updateHeader();
    autoRosterDialog.value = false;
    loadingStore.update(false);
  };
</script>
