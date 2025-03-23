<template>
  <v-container fluid class="h-full">
    <custom-calendar :attribute="attribute" />
  </v-container>
</template>

<script setup lang="ts">
  import { dbRef } from '@/firebase';
  import { useRoleStore } from '@/store/role';
  import { ApprovalDetail, Attendance, AttendanceDetail, Roster, RosterDetail } from '@/types';
  import { format } from 'date-fns';
  import { equalTo, get, orderByChild, query } from 'firebase/database';
  import { onMounted, reactive, ref } from 'vue';

  const roleStore = useRoleStore();

  const attendance = reactive<Attendance>({});
  const rosters = reactive<Roster>({});
  const attribute = ref<unknown[]>([]);
  const leaves = reactive<ApprovalDetail[]>([]);

  const getAttendance = async () => {
    Object.keys(attendance).forEach((key) => {
      delete attendance[key];
    });
    const attendanceData = await get(dbRef(`users/attendance/${roleStore.uid}`));
    if (attendanceData.val() == undefined) return;
    Object.assign(attendance, attendanceData.val());
  };

  const getRoster = async () => {
    Object.keys(rosters).forEach((key) => {
      delete rosters[key];
    });
    const rosterData = await get(dbRef(`users/roster/${roleStore.uid}`));
    if (rosterData.val() == undefined) return;
    Object.assign(rosters, rosterData.val());
  };

  const getLeaves = async () => {
    const leavesRef = await get(query(dbRef(`company/leave`), orderByChild('status'), equalTo('approved')));
    Object.entries(leavesRef.val()).forEach(([, value]) => {
      const leave = value as ApprovalDetail;
      if (leave.empID == roleStore.uid) {
        leaves.push(leave);
      }
    });
  };

  interface AttendanceRecord {
    [date: string]: {
      workTime?: string;
      workType?: string;
      workColor?: string;
      leaveTime?: string;
      leaveType?: string;
      leaveColor?: string;
      leaveShow?: boolean;
    };
  }

  const attendanceRecords = reactive<AttendanceRecord>({});

  const updateAttendance = (attendance: AttendanceDetail, roster: RosterDetail, date: string) => {
    if (!roster) return { workTime: '', workColor: '', leaveShow: false };
    // 請假
    if (roster.shift == 'leaveFull') return { workTime: roster.leaveType, workColor: 'orange', leaveShow: false };
    // 休息
    if (roster.shift == 'rest') return { workTime: '休息', workColor: 'grey', leaveShow: false };
    if (date > format(new Date(), 'yyyy-MM-dd')) return { workTime: '', workColor: '', leaveShow: false };
    // 缺席
    if (!attendance) return { workTime: '缺席', workColor: 'red', leaveTime: '缺卡', leaveColor: 'red', leaveShow: false };
    let attd = { workTime: attendance.workTime, workColor: '', leaveTime: attendance.leaveTime, leaveColor: '', leaveShow: true };
    // 缺卡
    if (attendance.workTime) {
      // 遲到
      attd.workColor = attendance.workTime > roster.start ? 'orange' : 'green';
    } else {
      attd.workTime = '缺卡';
      attd.workColor = 'red';
    }
    if (attendance.leaveTime) {
      // 早退
      attd.leaveColor = attendance.leaveTime < roster.end ? 'orange' : 'green';
    } else {
      attd.leaveTime = '缺卡';
      attd.leaveColor = 'red';
    }

    return attd;
  };

  onMounted(async () => {
    await getAttendance();
    await getRoster();
    await getLeaves();
    Object.entries(rosters).forEach(([date, roster]) => {
      const leave = leaves.filter((leave) => leave.start.startsWith(date))?.[0];
      let leaveStart = '';
      let leaveEnd = '';
      if (leave != undefined) {
        leaveStart = leave?.start.split(' ')[1];
        leaveEnd = leave?.end.split(' ')[1];
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
      }
      attendanceRecords[date] = updateAttendance(attendance[date], roster, date);
    });
    Object.entries(attendanceRecords).forEach(([date, value], index) => {
      if (rosters[date].shift == 'leaveBefore') {
        attribute.value.push({
          key: `leaveBefore${index}`,
          customData: {
            title: rosters[date].leaveType,
            class: 'bg-orange text-white',
          },
          dates: new Date(date),
        });
      }
      attribute.value.push({
        key: `work${index}`,
        customData: {
          title: value.workType == '外勤' ? `(${value.workTime})` : value.workTime,
          class: `bg-${value.workColor} text-white`,
        },
        dates: new Date(date),
      });
      if (!value.leaveShow) return;
      attribute.value.push({
        key: `leave${index}`,
        customData: {
          title: value.leaveTime,
          class: `bg-${value.leaveColor} text-white`,
        },
        dates: new Date(date),
      });
      if (rosters[date].shift == 'leaveAfter') {
        attribute.value.push({
          key: `leaveAfter${index}`,
          customData: {
            title: rosters[date].leaveType,
            class: 'bg-orange text-white',
          },
          dates: new Date(date),
        });
      }
    });
  });
</script>
