<template>
  <vc-calendar class="custom-calendar max-w-[1000px]" :attributes="props.attribute" disable-page-swipe is-expanded>
    <template #day-content="{ day, attributes }">
      <div v-if="day.inMonth" class="flex flex-col z-10 overflow-scroll">
        <span class="day-label text-sm text-gray-900">{{ day.day }}</span>
        <div class="flex-grow overflow-y-auto overflow-x-auto">
          <p v-for="attr in attributes" :key="attr.key" class="text-center text-xs break-word leading-tight rounded-sm p-1 mt-0 mb-1" :class="attr.customData.class">
            {{ attr.customData.title }}
          </p>
        </div>
      </div>
    </template>
  </vc-calendar>
</template>

<script setup lang="ts">
  const props = defineProps({
    attribute: {
      type: Array,
      default: () => [],
    },
  });
</script>
