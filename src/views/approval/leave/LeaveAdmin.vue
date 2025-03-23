<template>
  <v-container fluid class="h-full">
    <v-btn-toggle v-model="status" rounded="0" group color="green-darken-4" class="inline-flex mb-3" mandatory>
      <v-btn value="pending"> 待審批 </v-btn>
      <v-btn value="approved"> 已批准 </v-btn>
      <v-btn value="rejected"> 已否決 </v-btn>
      <v-btn value="canceled"> 已撤銷 </v-btn>
    </v-btn-toggle>
    <v-text-field v-model="search" class="min-w-[300px] inline-block align-bottom mb-3" label="搜尋" density="compact" variant="outlined" hide-details />
    <v-data-table items-per-page="-1" :headers="headers" :items="filterLeaves" :search="search">
      <template #headers="{ columns }">
        <tr>
          <template v-for="column in columns" :key="column.key">
            <th class="w-px whitespace-nowrap text-center">{{ column.title }}</th>
          </template>
        </tr>
      </template>
      <template #item="{ item }">
        <tr class="text-center">
          <td class="min-w-[90px] whitespace-pre-line">{{ item.columns.name }}</td>
          <td class="min-w-[90px]">{{ item.columns.type }}</td>
          <td class="min-w-[90px]">{{ item.columns.reason }}</td>
          <td class="min-w-[120px]">{{ item.columns.apply }}</td>
          <td class="min-w-[120px]">{{ item.columns.start }}</td>
          <td class="min-w-[120px]">{{ item.columns.end }}</td>
          <td>
            <div class="hidden md:inline-flex">
              <v-tooltip location="top">
                <template #activator="{ props }">
                  <v-btn v-if="status == 'pending'" density="compact" color="green-darken-4" icon="mdi-check" size="large" class="mr-2" v-bind="props" @click="onAction(item.raw, 'approve')" />
                </template>
                <span>批准</span>
              </v-tooltip>
              <v-tooltip location="top">
                <template #activator="{ props }">
                  <v-btn v-if="status == 'pending'" density="compact" color="red" icon="mdi-close" size="large" class="mr-2" v-bind="props" @click="onAction(item.raw, 'reject')" />
                </template>
                <span>否決</span>
              </v-tooltip>
              <v-tooltip location="top">
                <template #activator="{ props }">
                  <v-btn density="compact" color="grey" icon="mdi-delete" size="large" class="mr-2" v-bind="props" @click="confirmDelete(item.raw)" />
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
                <v-list-item v-if="status == 'pending'" @click="onAction(item.raw, 'approve')">
                  <v-list-item-title class="flex items-center"> <v-icon icon="mdi-check" /> 批准 </v-list-item-title>
                </v-list-item>
                <v-list-item v-if="status == 'pending'" @click="onAction(item.raw, 'reject')">
                  <v-list-item-title class="flex items-center"> <v-icon icon="mdi-close" /> 否決 </v-list-item-title>
                </v-list-item>
                <v-list-item @click="confirmDelete(item.raw)">
                  <v-list-item-title class="flex items-center"> <v-icon icon="mdi-delete" /> 刪除 </v-list-item-title>
                </v-list-item>
              </v-list>
            </v-menu>
          </td>
        </tr>
      </template>
    </v-data-table>
  </v-container>

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
          <span>是否確定要刪除此紀錄？</span>
        </v-card-text>
        <v-card-actions>
          <v-btn variant="flat" color="grey" @click="deleteDialog = false">取消</v-btn>
          <v-spacer />
          <v-btn variant="flat" color="red" @click="onAction(deleteLeave, 'delete')">刪除</v-btn>
        </v-card-actions>
      </v-container>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
  import { dbRef } from '@/firebase';
  import { useLoadingStore } from '@/store/loading';
  import { ApprovalDetail } from '@/types';
  import { DataSnapshot, get, onValue, remove, update } from 'firebase/database';
  import { computed, onMounted, onUnmounted, reactive, ref } from 'vue';

  const loadingStore = useLoadingStore();

  interface Leave extends ApprovalDetail {
    id: string;
    name: string;
  }

  const headers = [
    { title: '員工', key: 'name' },
    { title: '類型', key: 'type' },
    { title: '原因', key: 'reason' },
    { title: '申請日期', key: 'apply' },
    { title: '開始時間', key: 'start' },
    { title: '結束時間', key: 'end' },
    { title: '操作', key: 'action', sortable: false },
  ];

  const search = ref('');
  const leaves = reactive<Leave[]>([]);
  const filterLeaves = computed(() => leaves.filter((e) => e.status == status.value));

  onMounted(async () => {
    loadingStore.update(true);
    await getUsers();
    const leaveRef = await get(dbRef('company/leave'));
    getLeaves(leaveRef);
    loadingStore.update(false);
  });

  onUnmounted(() => {
    unsubscribe();
  });

  const status = ref('pending');
  const username: { [uid: string]: string } = {};

  const getUsers = async () => {
    const userInfo = await get(dbRef('users/info'));
    if (userInfo.val() == undefined) return;

    Object.entries(userInfo.val()).forEach(([id, value]) => {
      const user = value as { engName: string; chnName: string };
      username[id] = `${user.chnName}\n${user.engName}`;
    });
  };

  const getLeaves = (snapshot: DataSnapshot) => {
    leaves.length = 0;
    if (snapshot.val() == undefined) return;
    Object.entries(snapshot.val()).forEach(([id, value]) => {
      const leave = { name: '', id: id, ...(value as object) } as Leave;
      leave.name = username[leave.empID];
      leaves.push(leave);
    });
  };

  const unsubscribe = onValue(dbRef('company/leave'), (snapshot) => {
    getLeaves(snapshot);
  });

  const onAction = async (leave: Leave, action: string) => {
    loadingStore.update(true);
    switch (action) {
      case 'approve':
        await update(dbRef(`company/leave/${leave.id}`), { status: 'approved' });
        break;
      case 'reject':
        await update(dbRef(`company/leave/${leave.id}`), { status: 'rejected' });
        break;
      case 'delete':
        await remove(dbRef(`company/leave/${leave.id}`));
        deleteDialog.value = false;
        break;
    }
    loadingStore.update(false);
  };

  const deleteDialog = ref(false);
  let deleteLeave: Leave = {
    id: '',
    name: '',
    empID: '',
    start: '2023-11-11 12:34',
    apply: '',
    status: '',
    reason: '',
    type: '',
    end: '',
  };

  const confirmDelete = (leave: Leave) => {
    deleteLeave = leave;
    deleteDialog.value = true;
  };
</script>
