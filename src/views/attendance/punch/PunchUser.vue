<template>
  <v-container fluid class="h-full">
    <div class="inline-flex items-center">
      <v-text-field v-model="selectDate" label="日期" type="date" variant="outlined" density="compact" hide-details @update:model-value="updateData" />
      <!-- <v-btn color="green-darken-4" class="p-0 ml-2" flat>
        <v-icon>mdi-text-box-outline</v-icon>
        <span>記錄</span>
      </v-btn> -->
    </div>
    <v-timeline truncate-line="both" side="end" align="start" density="compact" class="h-auto">
      <v-timeline-item dot-color="blue" size="15" class="[&>*]:w-[85%]">
        <span class="text-sm text-gray-500 block">{{ `${roster.start ? '上班時間' : '上班打卡'}${roster.start}` }}</span>
        <div v-if="attendance.workTime">
          <p class="my-1">
            <b>打卡時間{{ attendance.workTime }} ({{ attendance.workType }}打卡)</b>
          </p>
          <!-- <v-icon size="x-small" class="">mdi-map-marker</v-icon>
          <span class="text-sm text-gray-500">位置</span> -->
        </div>
        <div v-else class="text-center min-[400px]:float-left min-[400px]:ml-[55px]">
          <div class="rounded-full shadow w-[150px] h-[150px] bg-gradient-to-t text-white mx-auto mt-6" :class="buttonColor('work')" @click="punchIn">
            <div class="translate-y-full text-lg">
              <p>
                <b v-if="locLoading">定位中</b>
                <b v-else>{{ `${!inRange ? '外勤' : inTime('work') ? '上班' : '遲到'}打卡` }}</b>
              </p>
              <span>{{ currentTime }}</span>
            </div>
          </div>
          <div v-if="!locLoading" class="text-sm mt-2">
            <div v-if="inRange">
              <v-icon color="blue">mdi-check-circle</v-icon>
              <span>已進入打卡範圍</span>
            </div>
            <div v-else>
              <v-icon color="orange">mdi-alert-circle</v-icon>
              <span>不在打卡範圍內</span>
              <span class="ml-2 text-blue" @click="checkLocation">重新定位</span>
            </div>
          </div>
        </div>
      </v-timeline-item>
      <v-timeline-item dot-color="blue" size="15" class="[&>*]:w-[85%]">
        <span class="text-sm text-gray-500 block">{{ `${roster.end ? '下班時間' : '下班打卡'}${roster.end}` }}</span>
        <div v-if="attendance.leaveTime">
          <p class="my-1">
            <b>打卡時間{{ attendance.leaveTime }} ({{ attendance.leaveType }}打卡)</b>
          </p>
          <!-- <v-icon size="x-small" class="">mdi-map-marker</v-icon>
          <span class="text-sm text-gray-500">位置</span> -->
        </div>
        <div v-else-if="attendance.workTime" class="text-center min-[400px]:float-left min-[400px]:ml-[55px]">
          <div class="rounded-full shadow w-[150px] h-[150px] bg-gradient-to-t text-white mx-auto mt-6" :class="buttonColor('leave')" @click="punchOut">
            <div class="translate-y-full text-lg">
              <p>
                <b v-if="locLoading">定位中</b>
                <b v-else>{{ `${!inRange ? '外勤' : inTime('leave') ? '下班' : '早退'}打卡` }}</b>
              </p>
              <span>{{ currentTime }}</span>
            </div>
          </div>
          <div v-if="!locLoading" class="text-sm mt-2">
            <div v-if="inRange">
              <v-icon color="blue">mdi-check-circle</v-icon>
              <span>已進入打卡範圍</span>
            </div>
            <div v-else>
              <v-icon color="orange">mdi-alert-circle</v-icon>
              <span>不在打卡範圍內</span>
              <span class="ml-2 text-blue" @click="checkLocation">重新定位</span>
            </div>
          </div>
        </div>
      </v-timeline-item>
    </v-timeline>
  </v-container>
</template>

<script setup lang="ts">
  import { dbRef } from '@/firebase';
  import { useLoadingStore } from '@/store/loading';
  import { useRoleStore } from '@/store/role';
  import { AttendanceDetail, RosterDetail } from '@/types';
  import { Geolocation } from '@capacitor/geolocation';
  import { format } from 'date-fns';
  import { get, update } from 'firebase/database';
  import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue';

  const roleStore = useRoleStore();
  const loadingStore = useLoadingStore();

  const now = ref(new Date());
  const currentTime = computed(() => format(now.value, 'HH:mm:ss'));
  const updateTimeInterval = setInterval(() => {
    now.value = new Date();
  }, 1000);

  const selectDate = ref(format(new Date(), 'yyyy-MM-dd'));

  const roster: RosterDetail = reactive({
    shift: '',
    start: '',
    end: '',
  });

  const initAttendance = {
    workTime: '',
    workType: '',
    leaveTime: '',
    leaveType: '',
  };
  const attendance: AttendanceDetail = reactive({ ...initAttendance });

  const getRoster = async () => {
    const rosterRef = await get(dbRef(`users/roster/${roleStore.uid}/${selectDate.value}`));
    if (rosterRef.val() == undefined) return;
    Object.assign(roster, rosterRef.val());
  };

  const getAttendance = async () => {
    const attendanceRef = await get(dbRef(`users/attendance/${roleStore.uid}/${selectDate.value}`));
    Object.assign(attendance, initAttendance);
    if (attendanceRef.val() == undefined) return;
    Object.assign(attendance, attendanceRef.val());
  };

  const updateData = async () => {
    loadingStore.update(true);
    await getRoster();
    await getAttendance();
    loadingStore.update(false);
  };

  const inTime = (type: string) => {
    var time = '';
    var normal = false;
    if (type == 'work') {
      time = roster.start;
      normal = time >= format(now.value, 'HH:mm');
    }
    if (type == 'leave') {
      time = roster.end;
      normal = time <= format(now.value, 'HH:mm');
    }
    return locLoading.value || !time || normal || !isToday();
  };

  const isToday = () => {
    return selectDate.value == format(now.value, 'yyyy-MM-dd');
  };

  const buttonColor = (type: string) => {
    if (!inRange.value) return 'from-[#6ab693] to-[#bae0c3]';
    if (!inTime(type)) return 'from-[#b15033] to-[#de9467]';
    return 'from-[#6a85b6] to-[#bac8e0]';
  };

  const rad = (deg: number) => {
    return deg * (Math.PI / 100);
  };

  const locLoading = ref(true);
  const inRange = ref(true);

  const checkLocation = async () => {
    locLoading.value = true;
    const currentLocation = await Geolocation.getCurrentPosition();
    const companyLocation = (await get(dbRef('company/location'))).val();
    const lat1 = currentLocation.coords.latitude;
    const lng1 = currentLocation.coords.longitude;
    const lat2 = companyLocation.lat;
    const lng2 = companyLocation.lng;
    const R = 6371e3;
    var latDiff = rad(lat2 - lat1);
    var lngDiff = rad(lng2 - lng1);
    var a = Math.sin(latDiff / 2) * Math.sin(lngDiff / 2) + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(lngDiff / 2) * Math.sin(lngDiff / 2);
    a = Math.abs(a);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    var d = R * c;
    inRange.value = d <= Number(companyLocation.range);
    locLoading.value = false;
  };

  const punchIn = async () => {
    if (locLoading.value || !isToday()) return;
    loadingStore.update(true);
    attendance.workTime = format(new Date(), 'HH:mm');
    attendance.workType = inRange.value ? '正常' : '外勤';
    await update(dbRef(`users/attendance/${roleStore.uid}/${selectDate.value}`), attendance).catch((err) => console.error(err));
    loadingStore.update(false);
  };

  const punchOut = async () => {
    if (locLoading.value || !isToday()) return;
    loadingStore.update(true);
    attendance.leaveTime = format(new Date(), 'HH:mm');
    attendance.leaveType = inRange.value ? '正常' : '外勤';
    await update(dbRef(`users/attendance/${roleStore.uid}/${selectDate.value}`), attendance).catch((err) => console.error(err));
    loadingStore.update(false);
  };

  onMounted(async () => {
    await updateData();
    await checkLocation();
    await Geolocation.requestPermissions().catch((err) => console.error(err));
  });

  onBeforeUnmount(() => {
    clearInterval(updateTimeInterval);
  });
</script>
