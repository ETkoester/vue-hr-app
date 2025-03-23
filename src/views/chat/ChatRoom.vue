<template>
  <v-container fluid class="p-0">
    <v-card flat>
      <v-row style="margin: 10px">
        <v-btn class="lg:hidden" icon="mdi-arrow-left" density="compact" size="x-large" :flat="true" @click="$router.back()" />
        <v-avatar image="https://cube.elemecdn.com/0/88/03b0d39583f48206768a7534e55bcpng.png" />
        <div class="ml-2 my-auto overflow-hidden whitespace-nowrap text-ellipsis">
          <span>{{ chatDetail.name }}</span>
        </div>
        <v-spacer />
        <v-btn icon="mdi-magnify" density="compact" size="x-large" :flat="true" />
        <v-btn icon="mdi-dots-vertical" density="compact" size="x-large" :flat="true" />
      </v-row>
    </v-card>
    <v-main id="messages" class="p-5 h-[calc(100vh-192px)] overflow-scroll scrollbar-hide border-t-2">
      <div v-for="(msg, key) in messages" :key="key" class="clearfix">
        <v-card class="!p-2 m-2 w-max max-w-[70%]" :class="msg.senderId == roleStore.uid ? 'right-message' : 'left-message'">
          <div>{{ msg.content }}</div>
          <div class="float-right text-sm">{{ formatTime(msg.timestamp) }}</div>
        </v-card>
      </div>
    </v-main>
    <v-card rounded="0">
      <v-row style="margin: 10px">
        <v-text-field v-model="messageInput" hide-details density="compact" />
        <v-btn icon="mdi-paperclip" density="compact" size="x-large" :flat="true" />
        <v-btn icon="mdi-send" density="compact" size="x-large" :flat="true" @click="sendMessage" />
      </v-row>
    </v-card>
  </v-container>
</template>

<script setup lang="ts">
  import { dbRef } from '@/firebase';
  import router from '@/router';
  import { useRoleStore } from '@/store/role';
  import { ChatDetail, Message, UserInfo } from '@/types';
  import { format } from 'date-fns';
  import { zhHK } from 'date-fns/locale';
  import { equalTo, get, limitToLast, onValue, orderByChild, push, query, update } from 'firebase/database';
  import { onMounted, onUnmounted, reactive, ref } from 'vue';

  const roleStore = useRoleStore();

  const chatId = router.currentRoute.value.params.chatId?.toString() ?? 'new';
  const chatDetail = reactive<ChatDetail>({
    iconUrl: '',
    isGroup: false,
    members: {},
    lastMsg: '',
    lastMsgTime: 0,
  });
  const messages = reactive<Message>({});
  const messageInput = ref('');
  const users = reactive<UserInfo>({});

  const formatTime = (timestamp: number) => {
    if (timestamp == undefined) return '';
    if (new Date(timestamp).toDateString() == new Date().toDateString()) {
      return format(timestamp, 'HH:mm');
    }
    return format(timestamp, 'MMMdo HH:mm', { locale: zhHK });
  };

  const scrollToBottom = async () => {
    await new Promise((resolve) => setTimeout(resolve, 10));
    const messageDiv = document.getElementById('messages');
    if (messageDiv != null) {
      messageDiv.scrollTo({ top: messageDiv.scrollHeight, behavior: 'smooth' });
    }
  };

  const getUsers = async () => {
    const userInfo = await get(query(dbRef('users/info'), orderByChild('empStatus'), equalTo('1')));
    if (userInfo.val() == undefined) return;
    Object.assign(users, userInfo.val());
  };

  const getChatDetail = async () => {
    if (chatId == 'new') {
      const targetId = router.currentRoute.value.params.uid.toString();
      chatDetail.members = { [targetId]: true, [roleStore.uid]: true };
    } else {
      const chatRef = await get(dbRef(`company/chats/${chatId}`));
      Object.assign(chatDetail, chatRef.val());
    }
    if (!chatDetail.isGroup) {
      const targetId = Object.keys(chatDetail.members).filter((uid) => uid != roleStore.uid)[0];
      chatDetail.name = `${users[targetId]?.chnName} ${users[targetId]?.engName}`;
    }
  };

  const initMessages = async () => {
    const messageRef = await get(dbRef(`company/chatMsgs/${chatId}`));
    if (messageRef.val() == undefined) return;
    Object.assign(messages, messageRef.val());
    await scrollToBottom();
  };

  const sendMessage = async () => {
    const message = {
      content: messageInput.value,
      senderId: roleStore.uid,
      timestamp: new Date().getTime(),
    };
    const chatUpdate = {
      lastMsg: messageInput.value,
      lastMsgTime: new Date().getTime(),
    };
    const isNewChat = chatId == 'new';
    let newChatId = '';
    if (isNewChat) {
      Object.assign(chatDetail, chatUpdate);
      const newChatRef = await push(dbRef(`company/chats`), chatDetail);
      if (newChatRef.key == undefined) return;
      newChatId = newChatRef.key;
    } else {
      newChatId = chatId;
    }
    await push(dbRef(`company/chatMsgs/${newChatId}`), message);
    await update(dbRef(`company/chats/${newChatId}`), chatUpdate);
    if (isNewChat) {
      router.replace(`/chat/${newChatId}`);
    }
    await scrollToBottom();
    messageInput.value = '';
  };

  const unsubscribe = onValue(query(dbRef(`company/chatMsgs/${chatId}`), limitToLast(1)), async (snapshot) => {
    Object.assign(messages, snapshot.val());
    await scrollToBottom();
  });

  onMounted(async () => {
    await getUsers();
    await getChatDetail();
    await initMessages();
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
