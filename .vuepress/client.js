import { defineClientConfig } from '@vuepress/client'
import Layout from './layouts/layout.vue'

export default defineClientConfig({
  enhance ({ router }) {

  },
  layouts: {
    Layout
  }
})