<template>
  <v-container>
    <v-card class="w-full min-[450px]:w-[400px] h-full m-auto !p-8">
      <v-img max-width="80" max-heigth="80" class="w-auto m-auto bg-white rounded-full" :src="logo" />

      <div>
        <v-form>
          <v-text-field v-model="form.email" class="mb-3" label="電郵地址" type="text" prepend-inner-icon="mdi-email-outline" variant="outlined" required :error-messages="v$.email.$errors.map((e) => e.$message.toString())" @blur="v$.email.$touch" />
          <v-text-field v-if="action != 'resetPass'" v-model="form.password" class="mb-3" label="密碼" :type="passwordVisible ? 'text' : 'password'" :append-inner-icon="passwordVisible ? 'mdi-eye-off' : 'mdi-eye'" prepend-inner-icon="mdi-lock-outline" variant="outlined" required :error-messages="v$.password.$errors.map((e) => e.$message.toString())" autocomplete="on" @click:append-inner="passwordVisible = !passwordVisible" @blur="v$.password.$touch" />
          <v-text-field v-if="action == 'register'" v-model="form.password2" class="mb-3" label="確認密碼" type="password" prepend-inner-icon="mdi-lock-outline" variant="outlined" required :error-messages="v$.password2.$errors.map((e) => e.$message.toString())" autocomplete="on" @blur="v$.password2.$touch" />
        </v-form>

        <div v-if="action == 'login'" class="text-center">
          <!-- <div class="text-left text-sm">
            <a class="hover:cursor-pointer hover:text-[#5f9ea0]" @click="onAction('resetPass')"> 忘記密碼？ </a>
          </div> -->
          <v-row>
            <v-col col="6" class="text-left self-center">
              <!-- <div v-if="!forgetPassword" class="text-left text-sm">
                <a class="hover:cursor-pointer hover:text-[#5f9ea0]" @click="onAction('register')"> 建立帳戶 </a>
              </div> -->
              <div class="text-left text-sm">
                <a class="hover:cursor-pointer hover:text-[#5f9ea0]" @click="onAction('resetPass')"> 忘記密碼？ </a>
              </div>
            </v-col>
            <v-col col="6" class="text-right">
              <v-btn class="bg-emerald-900 text-white" :disabled="loading" :loading="loading" @click="login"> 登入 </v-btn>
            </v-col>
          </v-row>
          <!-- <v-row no-gutters class="!flex my-4">
            <v-col cols="5" class="text-center">
              <v-divider class="mt-3" />
            </v-col>
            <v-col cols="2" class="text-center"> 或 </v-col>
            <v-col cols="5" class="text-center">
              <v-divider class="mt-3" />
            </v-col>
          </v-row>
          <v-btn variant="flat" class="white" size="small" @click="loginWithGoogle">
            <span class="custom-icon">以Google登入</span>
          </v-btn> -->
        </div>

        <div v-if="action == 'resetPass'">
          <v-row>
            <v-col col="6" class="text-left text-sm">
              <a class="hover:cursor-pointer hover:text-[#5f9ea0]" @click="onAction('login')"> 返回登入 </a>
            </v-col>
            <v-col col="6" class="text-right">
              <v-btn class="bg-emerald-900 text-white" :disabled="loading" :loading="loading" @click="resetPassword"> 重設密碼 </v-btn>
            </v-col>
          </v-row>
        </div>

        <!-- <div v-if="action == 'register'">
          <v-row>
            <v-col col="6" class="text-left text-sm">
              <a class="hover:cursor-pointer hover:text-[#5f9ea0]" @click="onAction('login')"> 返回登入 </a>
            </v-col>
            <v-col col="6" class="text-right">
              <v-btn class="bg-emerald-900 text-white" :disabled="loading" :loading="loading" @click="registerAccount"> 建立帳戶 </v-btn>
            </v-col>
          </v-row>
        </div> -->
      </div>
    </v-card>
  </v-container>
</template>

<script lang="ts" setup>
  import logo from '@/assets/logo.png';
  import { auth, getUserRole } from '@/firebase';
  import router, { resetRouter } from '@/router';
  import { useMessageStore } from '@/store/message';
  import { useRoleStore } from '@/store/role';
  import useVuelidate from '@vuelidate/core';
  import { email, helpers, required } from '@vuelidate/validators';
  import { sendPasswordResetEmail, signInWithEmailAndPassword } from 'firebase/auth';
  import { onMounted, reactive, ref } from 'vue';

  const loading = ref(false);
  const roleStore = useRoleStore();
  const messageStore = useMessageStore();

  const initForm = {
    email: '',
    password: '',
    password2: '',
  };

  const form = reactive({ ...initForm });

  const samePassword = () => {
    return action.value != 'register' || form.password == form.password2;
  };

  const rules = {
    email: { required: helpers.withMessage('請輸入電郵地址', required), email: helpers.withMessage('請輸入有效的電郵地址', email) },
    password: { required: helpers.withMessage('請輸入密碼', required) },
    password2: { required: helpers.withMessage('您輸入的兩個密碼並不相符', samePassword) },
  };

  const v$ = useVuelidate(rules, form);

  const action = ref('login');
  const passwordVisible = ref(false);

  const onAction = (type: string) => {
    action.value = type;
    v$.value.$reset();
    Object.assign(form, initForm);
  };

  const loginProccess = async (uid: string) => {
    roleStore.login(uid);
    const role = await getUserRole(uid);
    if (role != null) {
      roleStore.setRole(role);
      messageStore.showMessage('登入成功');
      if (role == 'user') router.replace({ path: '/punch' });
      else router.replace({ path: '/' });
    }
  };

  const login = async () => {
    const validForm = await v$.value.$validate();
    if (!validForm) return;
    loading.value = true;
    await signInWithEmailAndPassword(auth, form.email, form.password)
      .then(async (userCredential) => {
        await loginProccess(userCredential.user.uid);
      })
      .catch((err) => {
        messageStore.showMessage('登入失敗', 'error');
        console.error('error[' + err.code + '] ' + err.message);
      });
    loading.value = false;
  };

  const resetPassword = async () => {
    const validForm = await v$.value.$validate();
    if (!validForm) return;
    await sendPasswordResetEmail(auth, form.email)
      .then(() => {
        messageStore.showMessage('已發送重設密碼電郵');
      })
      .catch((err) => {
        messageStore.showMessage('無法發送重設密碼電郵', 'error');
        console.error('[' + err.code + '] ' + err.message);
      });
  };

  onMounted(() => {
    resetRouter();
  });
</script>

<style scoped>
  .custom-icon::before {
    content: url('../assets/gmail.svg');
    display: inline-block;
    height: 20px;
    width: 20px;
    margin-right: 10px;
    transform: translateY(2px);
  }
</style>
