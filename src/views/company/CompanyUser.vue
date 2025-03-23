<template>
  <v-container fluid class="h-full">
    <v-form class="px-3 shadow-sm">
      <v-row class="mt-2">
        <v-col cols="12" sm="6">
          <v-text-field v-model="form.name" label="公司名稱" prepend-inner-icon="mdi-text" readonly />
          <v-text-field v-model="form.tel" label="電話號碼" prepend-inner-icon="mdi-phone" readonly />
          <v-text-field v-model="form.email" label="電郵地址" prepend-inner-icon="mdi-email-outline" readonly />
          <v-text-field v-model="form.address" label="地址" prepend-inner-icon="mdi-office-building-marker-outline" readonly />
          <v-text-field v-model="form.website" label="公司網頁" prepend-inner-icon="mdi-web" readonly />
          公司商標：
          <v-img :src="logoUrl!" width="215" height="215" class="mb-4 border-grey-lighten-2 border-dashed border-grey-lighten-2" />
        </v-col>
        <v-col cols="12" sm="6">
          <span v-if="fileList?.items.length! > 0">公司文件：</span>
          <v-virtual-scroll max-height="300" :items="fileList?.items">
            <template #default="{ item }">
              <v-list-item :title="item.name">
                <template #append>
                  <v-btn class="ma-2" size="small" color="green-darken-4" density="compact" icon :disabled="downloading" @click="downloadFile(item.fullPath, item.name)">
                    <v-icon icon="mdi-download" flat color="grey-lighten-5"></v-icon>
                  </v-btn>
                </template>
              </v-list-item>
            </template>
          </v-virtual-scroll>
        </v-col>
      </v-row>
    </v-form>
  </v-container>
</template>

<script lang="ts" setup>
  import { getAllFromStorage, getRefData } from '@/firebase';
  import { useLoadingStore } from '@/store/loading';
  import { useLogoStore } from '@/store/logo';
  import { ListResult, getBlob, ref as storageRef } from 'firebase/storage';
  import { onMounted, reactive, ref, watch } from 'vue';
  import { useFirebaseStorage, useStorageFile } from 'vuefire';

  // Company info data
  const form = reactive({
    name: '',
    tel: '',
    email: '',
    address: '',
    website: '',
  });
  const fileList = ref<ListResult>(); // Uploaded document list
  const storage = useFirebaseStorage(); // Get firebase storage

  const logoRef = storageRef(storage, 'images/logo.png'); // Logo reference
  const { url: logoUrl } = useStorageFile(logoRef);
  const logoStore = useLogoStore();
  watch(logoUrl, (newValue) => {
    if (newValue != undefined) logoStore.updateURL(newValue);
  });

  // Upload company info, logo and documents

  const downloading = ref(false);
  const downloadFile = async (path: string, filename: string) => {
    downloading.value = true;
    const fileRef = storageRef(storage, path);
    const blob = await getBlob(fileRef);
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    URL.revokeObjectURL(link.href);
    document.body.removeChild(link);
    downloading.value = false;
  };

  const loadingStore = useLoadingStore();
  onMounted(async () => {
    loadingStore.update(true);
    fileList.value = await getAllFromStorage('docs');
    const data = await getRefData('company/info');
    form.name = data?.name;
    form.tel = data?.tel;
    form.email = data?.email;
    form.address = data?.address;
    form.website = data?.website;
    loadingStore.update(false);
  });
</script>
