<template>
  <ParentLayout>
    <template #page-content-top>
      <div class="reading-time">
        全文共<span class="reading-time-number">{{ wordNum }}</span
        >字，预计耗时<span class="reading-time-number">{{ timeDesc }}</span>。
      </div>
    </template>
    
  </ParentLayout>
</template>
<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, computed } from "vue";
import ParentLayout from "@vuepress/theme-default/lib/client/layouts/Layout.vue";
import { usePageData } from "@vuepress/client";
const page = usePageData();
const wordNum = computed(() => {
  return page.value.readingTime?.words;
});
const timeDesc = computed(() => {
  const minutes = page.value.readingTime?.minutes;
  if (minutes < 3) {
    return `${Math.round(minutes * 60)}秒`;
  } else {
    return `${Math.round(minutes)}分钟`;
  }
});
const isDarkMode = ref(false);
let observer;
onMounted(() => {
  const html = document.querySelector("html") as HTMLElement;
  isDarkMode.value = html.classList.contains("dark");
  // watch theme change
  observer = new MutationObserver(() => {
    isDarkMode.value = html.classList.contains("dark");
  });
  observer.observe(html, {
    attributeFilter: ["class"],
    attributes: true,
  });
});
onBeforeUnmount(() => {
  observer.disconnect();
});
</script>
<style scoped>
.reading-time {
  padding: 10px 0;
  color: var(--c-text-lightest);
}
.reading-time-number{
  color: var(--c-text-accent);
  padding: 0 3px;
}
</style>