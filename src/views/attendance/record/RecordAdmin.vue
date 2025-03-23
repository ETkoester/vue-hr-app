<template>
  <v-container class="h-full" fluid>
    <v-text-field v-model="month" type="month" label="月份" class="inline-block max-w-[200px] align-bottom mb-3 mr-4" density="compact" variant="outlined" hide-details @update:model-value="updateHeader" />
    <v-text-field v-model="search" label="搜尋員工" class="inline-block min-w-[200px] align-bottom mb-3 mr-4" density="compact" variant="outlined" hide-details />
    <v-btn-toggle v-model="empType" rounded="0" group color="green-darken-4" class="inline-flex mb-3 mr-4" mandatory>
      <v-btn value="all"> 全部 </v-btn>
      <v-btn value="ft"> 全職 </v-btn>
      <v-btn value="pt"> 兼職 </v-btn>
    </v-btn-toggle>
    <v-btn density="compact" color="green-darken-4" type="text" size="large" class="mb-3 mr-2" @click="refreshData">
      <v-icon>mdi-refresh</v-icon>
      重新整理
    </v-btn>

    <v-data-table :headers="headers" :items="filterUsers" :search="search" height="75vh" fixed-header items-per-page="-1">
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
            <td class="border !p-2" @click="editAttendance(item.raw.name, item.raw.uid, header.key)">
              <template v-if="rosters?.[item.raw.uid]?.[header.key] && header.key <= todayDate">
                <v-chip v-if="rosters?.[item.raw.uid]?.[header.key].shift == 'leaveBefore'" density="comfortable" color="orange">
                  {{ rosters?.[item.raw.uid]?.[header.key].leaveType }}
                </v-chip>
                <v-chip density="comfortable" :color="item.raw.attendance[header.key]?.workColor"> {{ item.raw.attendance[header.key]?.workTime }} {{ item.raw.attendance[header.key]?.workType }} </v-chip>
                <v-chip v-if="item.raw.attendance[header.key]?.leaveShow" class="mt-1" density="comfortable" :color="item.raw.attendance[header.key]?.leaveColor"> {{ item.raw.attendance[header.key]?.leaveTime }} {{ item.raw.attendance[header.key]?.leaveType }} </v-chip>
                <v-chip v-if="rosters?.[item.raw.uid]?.[header.key].shift == 'leaveAfter'" density="comfortable" color="orange">
                  {{ rosters?.[item.raw.uid]?.[header.key].leaveType }}
                </v-chip>
              </template>
            </td>
          </template>
        </tr>
      </template>
    </v-data-table>
  </v-container>

  <v-dialog v-model="editDialog" :fullscreen="windowWidth < 550" persistent :width="windowWidth < 550 ? '550' : '500'">
    <v-card>
      <v-toolbar dark color="green-darken-4">
        <v-btn icon dark @click="editDialog = false">
          <v-icon>mdi-close</v-icon>
        </v-btn>
        <v-toolbar-title>{{ '編輯打卡時間' }}</v-toolbar-title>
        <v-spacer></v-spacer>
      </v-toolbar>
      <v-container>
        <v-form>
          <v-text-field v-model="editForm.name" label="員工" readonly />
          <v-text-field v-model="editForm.date" label="日期" readonly />
          <vc-date-picker v-model="editWorkTime" mode="time" is24hr>
            <template #default="{ togglePopover }">
              <v-text-field v-model="editForm.workTime" label="上班時間" prepend-inner-icon="mdi-clock-outline" required readonly @click="togglePopover" />
            </template>
          </vc-date-picker>
          <v-radio-group v-model="editForm.workType" label="打卡類型" inline>
            <v-radio label="正常" value="正常"></v-radio>
            <v-radio label="外勤" value="外勤"></v-radio>
            <v-radio label="缺卡" value="缺卡"></v-radio>
          </v-radio-group>
          <vc-date-picker v-model="editLeaveTime" mode="time" is24hr>
            <template #default="{ togglePopover }">
              <v-text-field v-model="editForm.leaveTime" label="下班時間" prepend-inner-icon="mdi-clock-outline" required readonly @click="togglePopover" />
            </template>
          </vc-date-picker>
          <v-radio-group v-model="editForm.leaveType" label="打卡類型" inline>
            <v-radio label="正常" value="正常"></v-radio>
            <v-radio label="外勤" value="外勤"></v-radio>
            <v-radio label="缺卡" value="缺卡"></v-radio>
          </v-radio-group>
        </v-form>
        <v-card-actions>
          <v-btn variant="flat" color="red" @click="deleteRecord()">清除</v-btn>
          <v-spacer />
          <v-btn variant="flat" color="green-darken-4" @click="updateAttendanceRecord">更新</v-btn>
        </v-card-actions>
      </v-container>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
  import { dbRef } from '@/firebase';
  import { ApprovalDetail, AttendanceDetail, RosterDetail, UserAttendance, UserInfoDetail, UserRoster } from '@/types';
  import { format } from 'date-fns';
  import Holidays from 'date-holidays';
  import { equalTo, get, orderByChild, query, remove, set } from 'firebase/database';
  import { computed, onBeforeMount, onMounted, reactive, ref } from 'vue';

  const todayDate = format(new Date(), 'yyyy-MM-dd');

  const windowWidth = ref(window.innerWidth);

  onBeforeMount(() => {
    window.removeEventListener('resize', onResize);
  });

  const onResize = () => {
    windowWidth.value = window.innerWidth;
  };

  onMounted(async () => {
    window.addEventListener('resize', onResize);
    await getLeaves();
    await getRosters();
    await getAttendance();
    await getUsers();
    updateHeader();
  });

  const empType = ref('all');

  const editWorkTime = ref(new Date());
  const editLeaveTime = ref(new Date());
  const editDialog = ref(false);
  const initEditForm = {
    uid: '',
    name: '',
    date: '',
    workTime: computed(() => format(editWorkTime.value, 'HH:mm')),
    workType: '正常',
    leaveTime: computed(() => format(editLeaveTime.value, 'HH:mm')),
    leaveType: '正常',
  };
  const editForm = reactive({ ...initEditForm });

  const editAttendance = (name: string, uid: string, date: string) => {
    Object.assign(editForm, initEditForm);
    editForm.name = name;
    editForm.uid = uid;
    editForm.date = date;
    editWorkTime.value = new Date(`${date} ${attendance[uid]?.[date]?.workTime ?? '00:00'}`);
    editForm.workType = attendance[uid]?.[date]?.workType ?? '缺卡';
    editLeaveTime.value = new Date(`${date} ${attendance[uid]?.[date]?.leaveTime ?? '00:00'}`);
    editForm.leaveType = attendance[uid]?.[date]?.leaveType ?? '缺卡';
    editDialog.value = true;
  };

  const refreshData = async () => {
    await getAttendance();
    updateHeader();
  };

  const updateAttendanceRecord = async () => {
    const updateRecord = {};
    if (editForm.workType != '缺卡') {
      Object.assign(updateRecord, { workTime: editForm.workTime, workType: editForm.workType });
    }
    if (editForm.leaveType != '缺卡') {
      Object.assign(updateRecord, { leaveTime: editForm.leaveTime, leaveType: editForm.leaveType });
    }
    await set(dbRef(`users/attendance/${editForm.uid}/${editForm.date}`), updateRecord);
    await refreshData();
    editDialog.value = false;
  };

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
        const leave = leaves.filter((leave) => leave.empID == user.uid && leave.start.startsWith(formattedDate))?.[0];
        const roster = rosters[user.uid]?.[formattedDate];
        if (leave != undefined && roster != undefined && !roster.shift.startsWith('leave')) {
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
          rosters[user.uid][formattedDate] = roster;
        }

        user.attendance[formattedDate] = updateAttendance(attendance[user.uid]?.[formattedDate], rosters[user.uid]?.[formattedDate]);
      });
    }
  };

  const search = ref('');

  interface UserAttendanceArray {
    uid: string;
    name: string;
    empType: string;
    attendance: {
      [date: string]: {
        workTime?: string;
        workType?: string;
        workColor?: string;
        leaveTime?: string;
        leaveType?: string;
        leaveColor?: string;
        leaveShow?: boolean;
      };
    };
  }
  const users = ref<UserAttendanceArray[]>([]);
  const filterUsers = computed(() => {
    return users.value.filter((user) => empType.value == 'all' || user.empType == empType.value);
  });

  const getUsers = async () => {
    const userInfo = await get(dbRef('users/info'));
    Object.entries(userInfo.val()).forEach(([id, value]) => {
      const user = value as UserInfoDetail;
      if (user.empStatus == '0') return;
      users.value.push({
        uid: id,
        name: `${user.chnName}\n${user.engName}`,
        empType: user.empType,
        attendance: {},
      });
    });
  };

  const attendance = reactive<UserAttendance>({});

  const getAttendance = async () => {
    Object.keys(attendance).forEach((key) => {
      delete attendance[key];
    });
    await get(dbRef('users/attendance')).then((snapshot) => {
      if (snapshot.val()) {
        Object.keys(attendance).forEach((key) => {
          delete attendance[key];
        });
        Object.assign(attendance, snapshot.val());
      }
    });
  };

  const updateAttendance = (attendance: AttendanceDetail, roster: RosterDetail) => {
    if (!roster) return { workTime: '', workColor: '', leaveShow: false };
    // 休息
    if (roster.shift == 'rest') return { workTime: '休息', workColor: 'grey', leaveShow: false };
    // 請假
    if (roster.shift == 'leaveFull') return { workTime: roster.leaveType, workColor: 'orange', leaveShow: false };
    // 缺席
    if (!attendance) return { workTime: '缺卡', workColor: 'red', leaveTime: '缺卡', leaveColor: 'red', leaveShow: true };
    let attd = { workTime: attendance.workTime, workType: attendance.workType, workColor: '', leaveTime: attendance.leaveTime, leaveType: attendance.leaveType, leaveColor: '', leaveShow: true };
    // 缺卡
    if (!attendance.workTime) {
      attd.workTime = '缺卡';
      attd.workColor = 'red';
    } else {
      attd.workColor = attendance.workTime > roster.start ? 'orange' : 'green';
    }
    if (!attendance.leaveTime) {
      attd.leaveTime = '缺卡';
      attd.leaveColor = 'red';
    } else {
      attd.leaveColor = attendance.leaveTime < roster.end ? 'orange' : 'green';
    }

    return attd;
  };

  const rosters = reactive<UserRoster>({});

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

  const deleteRecord = async () => {
    await remove(dbRef(`users/attendance/${editForm.uid}/${editForm.date}`));
    await getAttendance();
    updateHeader();
    editDialog.value = false;
  };

  const leaves = reactive<ApprovalDetail[]>([]);

  const getLeaves = async () => {
    const leavesRef = await get(query(dbRef(`company/leave`), orderByChild('status'), equalTo('approved')));
    Object.entries(leavesRef.val()).forEach(([, value]) => {
      leaves.push(value as ApprovalDetail);
    });
  };
</script>
