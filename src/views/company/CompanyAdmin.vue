<template>
  <v-container fluid class="h-full">
    <v-form class="px-3 shadow-sm">
      <v-row class="mt-2">
        <v-col cols="12" sm="6">
          <v-text-field v-model="form.name" label="公司名稱" prepend-inner-icon="mdi-text" />
          <v-text-field v-model="form.tel" label="電話號碼" prepend-inner-icon="mdi-phone" />
          <v-text-field v-model="form.email" label="電郵地址" prepend-inner-icon="mdi-email-outline" />
          <v-text-field v-model="form.address" label="地址" prepend-inner-icon="mdi-office-building-marker-outline" />
          <v-text-field v-model="form.website" label="公司網頁" prepend-inner-icon="mdi-web" />
          商標預覽：
          <v-img :src="logoUrl!" width="215" height="215" class="mb-4 border-grey-lighten-2 border-dashed border-grey-lighten-2" />
          <v-file-input v-model="logoFile" show-size label="上傳商標" prepend-inner-icon="mdi-image" prepend-icon="" accept="image/png" />
        </v-col>
        <v-col cols="12" sm="6">
          <span v-if="fileList?.items.length! > 0">已上載文件：</span>
          <v-virtual-scroll max-height="300" :items="fileList?.items">
            <template #default="{ item }">
              <v-list-item :title="item.name">
                <template #append>
                  <v-btn class="ma-2" size="small" color="green-darken-4" density="compact" icon :disabled="downloading" @click="downloadFile(item.fullPath, item.name)">
                    <v-icon icon="mdi-download" flat color="grey-lighten-5"></v-icon>
                  </v-btn>
                  <v-btn class="ma-2" size="small" color="grey-lighten-1" density="compact" icon :disabled="deleting" @click="deleteFile(item.fullPath)">
                    <v-icon icon="mdi-minus" color="grey-lighten-5"></v-icon>
                  </v-btn>
                </template>
              </v-list-item>
            </template>
          </v-virtual-scroll>
          <v-file-input v-model="documents" show-size multiple chips prepend-inner-icon="mdi-file-document-multiple-outline" prepend-icon="" label="上傳文件" />
          <v-progress-linear v-if="uploadDocProgress != 0" v-model="uploadDocProgress" height="25" color="amber" class="mb-4">
            <template #default="{ value }">
              <span>{{ value }}%</span>
            </template>
          </v-progress-linear>
          <div class="d-flex align-end flex-column">
            <v-btn color="green-darken-4" dark size="large" :disabled="uploading" :loading="uploading" class="w-full min-[600px]:w-auto" @click="upload"> 儲存 </v-btn>
          </div>
        </v-col>
      </v-row>
    </v-form>
  </v-container>
</template>

<script lang="ts" setup>
  import { dbRef, getAllFromStorage, getRefData } from '@/firebase';
  import { useLoadingStore } from '@/store/loading';
  import { useLogoStore } from '@/store/logo';
  import { update } from 'firebase/database';
  import { ListResult, deleteObject, getBlob, ref as storageRef, uploadBytes } from 'firebase/storage';
  import { computed, onMounted, reactive, ref, watch } from 'vue';
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

  const logoFile = ref<File[] | undefined>(undefined); // Logo file in input field
  const logoRef = storageRef(storage, 'images/logo.png'); // Logo reference
  const { url: logoUrl, upload: logoUpload } = useStorageFile(logoRef);
  const logoStore = useLogoStore();
  watch(logoUrl, (newValue) => {
    if (newValue != undefined) logoStore.updateURL(newValue);
  });

  const documents = ref<File[] | undefined>(); // Documents in input field
  const uploading = ref(false); // Documents uploading status
  const uploadedDocCount = ref(0); // Uploaded documents count

  // Upload company info, logo and documents
  const upload = async () => {
    uploading.value = true;

    // Update company info
    await update(dbRef('company/info'), form);

    // Upload logo
    if (logoFile.value != undefined) {
      await logoUpload(logoFile.value[0]);
      logoFile.value = undefined;
    }
    // Upload documents
    if (documents.value != undefined && documents.value.length > 0) {
      for (let i = 0; i < documents.value.length; i++) {
        uploadedDocCount.value++;
        const docRef = storageRef(storage, `docs/${documents.value[i].name}`);
        await uploadBytes(docRef, documents.value[0]);
      }
      fileList.value = await getAllFromStorage('docs');
      uploadedDocCount.value = 0;
      documents.value = undefined;
    }
    uploading.value = false;
  };

  const deleting = ref(false);
  const deleteFile = async (path: string) => {
    deleting.value = true;
    const fileRef = storageRef(storage, path);
    await deleteObject(fileRef);
    fileList.value = await getAllFromStorage('docs');
    deleting.value = false;
  };

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

  const uploadDocProgress = computed(() => {
    const docLen = documents.value?.length;
    if (docLen == undefined) return 0;
    else return Math.round((uploadedDocCount.value / docLen) * 100).toFixed(0);
  });
</script>
