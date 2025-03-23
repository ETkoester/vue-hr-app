<template>
  <v-container fluid class="h-full">
    <custom-calendar :attribute="attribute" />
  </v-container>
</template>

<script setup lang="ts">
  import { dbRef } from '@/firebase';
  import { useRoleStore } from '@/store/role';
  import { ApprovalDetail, Roster, RosterDetail } from '@/types';
  import { equalTo, get, orderByChild, query } from 'firebase/database';
  import { onMounted, reactive, ref } from 'vue';

  const roleStore = useRoleStore();

  const roster = reactive<Roster>({});
  const attribute = ref<unknown[]>([]);
  const leaves = reactive<ApprovalDetail[]>([]);

  const getRoster = async () => {
    Object.keys(roster).forEach((key) => {
      delete roster[key];
    });
    const rosterData = await get(dbRef(`users/roster/${roleStore.uid}`));
    if (rosterData.val() == undefined) return;
    Object.assign(roster, rosterData.val());
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

  const workStatus = (roster: RosterDetail) => {
    if (roster.shift == 'rest') return '休息';
    if (roster.shift == 'leaveFull') return roster.leaveType;
    return null;
  };

  const workColor = (shift: string) => {
    if (shift == 'rest') return 'grey';
    if (shift == 'leaveFull') return 'orange';
    return 'red';
  };

  onMounted(async () => {
    await getRoster();
    await getLeaves();
    Object.entries(roster).forEach(([date, roster], index) => {
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

      if (roster.shift == 'leaveBefore') {
        attribute.value.push({
          key: `leaveBefore${index}`,
          customData: {
            title: roster.leaveType,
            class: 'bg-orange text-white',
          },
          dates: new Date(date),
        });
      }
      attribute.value.push({
        key: `work${index}`,
        customData: {
          title: workStatus(roster) ?? roster.start,
          class: `bg-${workColor(roster.shift)} text-white`,
        },
        dates: new Date(date),
      });
      if (roster.end) {
        attribute.value.push({
          key: `leave${index}`,
          customData: {
            title: roster.end,
            class: 'bg-blue text-white',
          },
          dates: new Date(date),
        });
      }
      if (roster.shift == 'leaveAfter') {
        attribute.value.push({
          key: `leaveAfter${index}`,
          customData: {
            title: roster.leaveType,
            class: 'bg-orange text-white',
          },
          dates: new Date(date),
        });
      }
    });
  });
</script>
