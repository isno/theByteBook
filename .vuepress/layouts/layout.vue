<template>
  <ParentLayout>
    <template #page-content-bottom>
      
       <div class="page-info">

        <div class="star">
          <github-button  data-icon="octicon-star" href="https://github.com/isno/thebytebook">Star 关注</github-button>
        </div>
          <div class="last-updated" >
            <span class="prefix" v-if="pageWords > 0">总字数:</span>
            <span class="words" v-if="pageWords > 0"> {{ pageWords}} </span>
            <span class="prefix" v-if="pageWords > 0">字</span>
        </div>
      </div>
      <CommentService :darkmode="isDarkMode" class="layout-comment" />
      <div class="qrcode">
         <img src="../../assets/qrcode-v2.png" width = "160"  align=center />
      </div>
    </template>
  </ParentLayout>
</template>
<script setup>
  import { ref, onMounted, onUnmounted,computed } from 'vue'
  import { usePageData } from '@vuepress/client';
  import GithubButton from 'vue-github-button'

  import ParentLayout from '@vuepress/theme-default/layouts/Layout.vue'

  const page = usePageData();

  const pageWords = computed(() => {
    return page.value.readingTime.words;
  });

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
  .qrcode {
    position: fixed;
    bottom: 60px;
    right: 20px;
  }

  @media screen and (max-width: 1024px) {
      .qrcode {
        display: none;
      }
  }
  .qrcode img {
    border-radius: 6px;
    box-shadow: 0 3px 3px 1px rgba(0,0,0,0.1);
  }
  .layout-comment {
    max-width: initial;
    margin-top: 100px;
    padding: 0;
  }
  .page-info {
    display: flex;
    justify-content:  space-between;
    margin-top:30px;
    border-bottom: 1px solid #eaecef;
  }
  .last-updated {
    text-align:right;
    font-size: .9em;
    margin-bottom: 10px;
  }
  .prefix {
    font-weight: 500;
    color: #4e6e8e;
  }
  .words {
    font-weight: 400;
    color: #aaa;
    padding: 0px 3px;
  }
</style>