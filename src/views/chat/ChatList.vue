<template>
  <v-container fluid class="h-full p-0 block lg:flex">
    <div class="w-full lg:w-[25%] lg:block" :class="inChatRoom ? 'hidden' : 'block'">
      <v-container fluid class="p-0 h-full border-r-2">
        <template v-if="!creatingChat && !creatingGroup">
          <div class="border-b-2">
            <v-card flat>
              <v-row style="margin: 10px">
                <div class="m-auto">聊天室</div>
                <v-spacer />
                <v-menu>
                  <template #activator="{ props }">
                    <v-btn icon="mdi-plus-circle" density="compact" size="x-large" :flat="true" v-bind="props" />
                  </template>
                  <v-list>
                    <v-list-item @click="creatingChat = true">
                      <v-list-item-title>新增私人對話</v-list-item-title>
                    </v-list-item>
                    <v-list-item @click="creatingGroup = true">
                      <v-list-item-title>新增團體群組</v-list-item-title>
                    </v-list-item>
                  </v-list>
                </v-menu>
              </v-row>
            </v-card>
          </div>
          <v-main class="p-0 h-[calc(100vh-128px)] overflow-scroll scrollbar-hide">
            <v-card v-for="(chat, chatId) in chats" :key="chatId" flat class="!p-2 w-full !flex" @click="openChat(chatId.toString())">
              <v-avatar class="mr-2" image="https://cube.elemecdn.com/0/88/03b0d39583f48206768a7534e55bcpng.png" />
              <div class="overflow-hidden whitespace-nowrap text-ellipsis">
                <span>{{ chat.name }}</span>
                <br />
                <span>{{ chat.lastMsg || '未有訊息' }}</span>
              </div>
              <v-spacer />
              <div class="min-w-max ml-2 h-max">{{ chat.lastMsgTime == 0 ? '' : formatTime(chat.lastMsgTime) }}</div>
            </v-card>
          </v-main>
        </template>
        <template v-if="creatingChat">
          <div class="border-b-2">
            <v-card flat>
              <v-row style="margin: 10px">
                <v-btn icon="mdi-arrow-left" density="compact" size="x-large" :flat="true" @click="creatingChat = false" />
                <div class="m-auto">新增私人對話</div>
                <v-spacer />
              </v-row>
            </v-card>
          </div>
          <v-main class="p-0 h-[calc(100vh-128px)] overflow-scroll scrollbar-hide">
            <v-card v-for="(user, key) in users" :key="key" flat class="!p-2 w-full !flex border-b-2" @click="createChat(key.toString())">
              <v-avatar class="mr-2" image="https://cube.elemecdn.com/0/88/03b0d39583f48206768a7534e55bcpng.png" />
              <div class="overflow-hidden whitespace-nowrap text-ellipsis">
                <span>{{ user.chnName }}</span>
                <br />
                <span>{{ user.engName }}</span>
              </div>
            </v-card>
          </v-main>
        </template>
        <template v-if="creatingGroup">
          <div class="border-b-2">
            <v-card flat>
              <v-row style="margin: 10px">
                <v-btn icon="mdi-arrow-left" density="compact" size="x-large" :flat="true" @click="creatingGroup = false" />
                <div class="m-auto">新增團體群組</div>
                <v-spacer />
              </v-row>
            </v-card>
          </div>
          <v-main class="p-0 h-[calc(100vh-128px)] overflow-scroll scrollbar-hide">
            <div class="flex p-2">
              <v-text-field v-model="groupNameInput" variant="outlined" label="群組名稱" hide-details density="compact" />
              <v-btn class="my-auto ml-2" variant="flat" color="success" @click="createGroup">創建群組</v-btn>
            </div>
            <v-sheet v-for="(user, key) in users" :key="key" flat class="!p-2 w-full !flex border-b-2">
              <v-checkbox v-model="selectedUsers" class="flex-none" :value="key" hide-details />
              <v-avatar class="mr-2" image="https://cube.elemecdn.com/0/88/03b0d39583f48206768a7534e55bcpng.png" />
              <div class="overflow-hidden whitespace-nowrap text-ellipsis">
                <span>{{ user.chnName }}</span>
                <br />
                <span>{{ user.engName }}</span>
              </div>
            </v-sheet>
          </v-main>
        </template>
      </v-container>
    </div>

    <div class="w-full lg:w-[75%] lg:block" :class="inChatRoom ? 'block' : 'hidden'">
      <router-view :key="$route.path" />
    </div>
  </v-container>
</template>

<script setup lang="ts">
  import { dbRef } from '@/firebase';
  import router from '@/router';
  import { useRoleStore } from '@/store/role';
  import { Chat, ChatDetail, UserInfo } from '@/types';
  import { format } from 'date-fns';
  import { zhHK } from 'date-fns/locale';
  import { DataSnapshot, equalTo, get, onValue, orderByChild, push, query } from 'firebase/database';
  import { watch } from 'vue';
  import { onMounted, onUnmounted, reactive, ref } from 'vue';

  const roleStore = useRoleStore();
  const creatingChat = ref(false);
  const creatingGroup = ref(false);
  const users = reactive<UserInfo>({});
  const selectedUsers = ref<string[]>([]);
  const chats = reactive<Chat>({});

  const inChatRoom = ref(false);
  const groupNameInput = ref('');

  watch(router.currentRoute, async (newRoute) => {
    if (newRoute.name == undefined) return;
    inChatRoom.value = newRoute.name.toString().includes('Room');
  });

  const formatTime = (timestamp: number) => {
    if (timestamp == undefined) return '';
    if (new Date(timestamp).toDateString() == new Date().toDateString()) {
      return format(timestamp, 'HH:mm');
    }
    return format(timestamp, 'MMMdo HH:mm', { locale: zhHK });
  };

  const openChat = (chatId: string) => {
    router.push(`/chat/${chatId}`);
  };

  const createGroup = async () => {
    if (selectedUsers.value.length == 0 || !groupNameInput.value) return;
    const newChatDetail: ChatDetail = {
      name: groupNameInput.value,
      iconUrl: '',
      isGroup: true,
      members: {},
      lastMsg: '',
      lastMsgTime: 0,
    };
    selectedUsers.value.forEach((user) => {
      newChatDetail.members[user] = true;
    });
    const newGroupChat = await push(dbRef(`company/chats`), newChatDetail);
    creatingGroup.value = false;
    if (newGroupChat.key == undefined) return;
    openChat(newGroupChat.key);
  };

  const createChat = async (targetId: string) => {
    const existingChat = Object.entries(chats).filter(([, chatDetail]) => !chatDetail.isGroup && chatDetail.members[targetId])[0];
    creatingChat.value = false;
    if (existingChat) {
      openChat(existingChat[0]);
    } else {
      router.push(`/chat/new/${targetId}`);
    }
  };

  const getUsers = async () => {
    const userInfo = await get(query(dbRef('users/info'), orderByChild('empStatus'), equalTo('1')));
    if (userInfo.val() == undefined) return;
    Object.assign(users, userInfo.val());
  };

  const getChats = async (snapshot: DataSnapshot) => {
    Object.keys(chats).forEach((key) => {
      delete chats[key];
    });
    if (snapshot.val() == undefined) return;
    Object.assign(chats, snapshot.val());
    Object.entries(chats).forEach(([, detail]) => {
      const chatDetail = detail as ChatDetail;
      if (!chatDetail.isGroup) {
        const targetId = Object.keys(chatDetail.members).filter((uid) => uid != roleStore.uid)[0];
        chatDetail.name = `${users[targetId]?.chnName} ${users[targetId]?.engName}`;
      }
    });
  };

  const unsubscribe = onValue(query(dbRef(`company/chats`), orderByChild(`members/${roleStore.uid}`), equalTo(true)), (snapshot) => {
    getChats(snapshot);
  });

  onMounted(async () => {
    await getUsers();
    const chatListRef = await get(query(dbRef(`company/chats`), orderByChild(`members/${roleStore.uid}`), equalTo(true)));
    getChats(chatListRef);
  });

  onUnmounted(() => {
    unsubscribe();
  });
</script>

<style scoped>
  .scrollbar-hide::-webkit-scrollbar {
    display: none;
  }

  /* For IE, Edge and Firefox */
  .scrollbar-hide {
    -ms-overflow-style: none; /* IE and Edge */
    scrollbar-width: none; /* Firefox */
  }

  .clearfix::after {
    content: '';
    display: table;
    clear: both;
  }

  .left-message {
    float: left;
  }

  .right-message {
    float: right;
    background: #d9fdd3;
  }

  .v-theme--dark .right-message {
    background: #005c4b;
  }
</style>
