<template>
  <v-container>
    <v-card class="w-full min-[450px]:w-[400px] h-full m-auto !p-8">
      <v-card-title class="text-center mb-4"> 建立帳戶 </v-card-title>

      <v-card-text>
        <v-form>
          <v-text-field v-model="form.email" class="mb-3" label="電郵地址" variant="outlined" prepend-inner-icon="mdi-email-outline" readonly />
          <v-text-field v-model="form.chnName" class="mb-3" label="中文名字" variant="outlined" prepend-inner-icon="mdi-ideogram-cjk" required :error-messages="v$.chnName.$errors.map((e) => e.$message.toString())" @blur="v$.chnName.$touch" />
          <v-text-field v-model="form.engName" class="mb-3" label="英文名字" variant="outlined" prepend-inner-icon="mdi-format-text-variant" required :error-messages="v$.engName.$errors.map((e) => e.$message.toString())" @blur="v$.engName.$touch" />
          <v-text-field v-model="form.tel" class="mb-3" label="電話號碼" variant="outlined" prepend-inner-icon="mdi-phone" required :error-messages="v$.tel.$errors.map((e) => e.$message.toString())" @blur="v$.tel.$touch" />
          <v-text-field v-model="form.address" class="mb-3" label="居住地址" variant="outlined" prepend-inner-icon="mdi-office-building-marker" required :error-messages="v$.address.$errors.map((e) => e.$message.toString())" @blur="v$.address.$touch" />
          <vc-date-picker v-model="dobValue" mode="date" :popover="popover">
            <template #default="{ togglePopover }">
              <v-text-field v-model="form.dob" class="mb-3" label="出生日期" variant="outlined" prepend-inner-icon="mdi-calendar-month-outline" required :error-messages="v$.dob.$errors.map((e) => e.$message.toString())" @click="togglePopover" @blur="v$.dob.$touch" />
            </template>
          </vc-date-picker>
        </v-form>
      </v-card-text>

      <v-card-actions>
        <v-btn variant="flat" color="red" @click="onLogout">登出</v-btn>
        <v-spacer />
        <v-btn variant="flat" color="green-darken-4" @click="onSubmit">註冊</v-btn>
      </v-card-actions>
    </v-card>
  </v-container>
</template>

<script setup lang="ts">
  import { auth, dbRef } from '@/firebase';
  import router from '@/router';
  import { useLoadingStore } from '@/store/loading';
  import { useMessageStore } from '@/store/message';
  import { useRoleStore } from '@/store/role';
  import useVuelidate from '@vuelidate/core';
  import { helpers, required } from '@vuelidate/validators';
  import { format } from 'date-fns';
  import { set } from 'firebase/database';
  import { computed, reactive, ref } from 'vue';

  const loadingStore = useLoadingStore();
  const roleStore = useRoleStore();
  const messageStore = useMessageStore();

  const popover = ref({
    visibility: 'click',
    placement: 'bottom',
  });

  const initForm = {
    email: auth.currentUser?.email,
    chnName: '',
    engName: '',
    tel: '',
    address: '',
    dob: computed(() => format(dobValue.value, 'yyyy-MM-dd')),
    empDate: format(new Date(), 'yyyy-MM-dd'),
    empStatus: '1',
  };

  const dobValue = ref(new Date());

  const form = reactive({ ...initForm });

  const rules = {
    chnName: { required: helpers.withMessage('請輸入中文名字', required) },
    engName: { required: helpers.withMessage('請輸入英文名字', required) },
    tel: { required: helpers.withMessage('請輸入電話號碼', required) },
    address: { required: helpers.withMessage('請輸入居住地址', required) },
    dob: { required: helpers.withMessage('請輸入出生日期', required) },
  };

  const v$ = useVuelidate(rules, form);

  const onSubmit = async () => {
    const validForm = await v$.value.$validate();
    if (!validForm) return;
    loadingStore.update(true);
    await set(dbRef(`users/role/${auth.currentUser?.uid}`), 'user');
    await set(dbRef(`users/info/${auth.currentUser?.uid}`), form);
    loadingStore.update(false);
    roleStore.setRole('user');
    messageStore.showMessage('註冊成功');
    router.replace({ path: '/home' });
  };

  const onLogout = async () => {
    await auth.signOut();
  };
</script>
