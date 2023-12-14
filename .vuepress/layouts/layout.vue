<template>
  <ParentLayout>
    <template #page-content-bottom>
      <CommentService :darkmode="isDarkMode" class="layout-comment" />
    </template>
  </ParentLayout>
</template>
<script setup>
  import { ref, onMounted, onUnmounted } from 'vue'
  import ParentLayout from '@vuepress/theme-default/layouts/Layout.vue'
  const isDarkMode = ref(false)
  let observer

  onMounted(() => {
    const htmlDom = document.documentElement
    isDarkMode.value = htmlDom.classList.contains('dark')

    observer = new MutationObserver(() => {
      isDarkMode.value = htmlDom.classList.contains('dark')
    })

    observer.observe(htmlDom, {
      attributeFilter: ['class']
    })
  })

  onUnmounted(() => {
    if (observer) {
      observer.disconnect()
    }
  })

</script>
<style lang="scss" scoped>
  .layout-comment {
    max-width: initial;
    margin-top: 100px;
    padding: 0;
  }
</style>