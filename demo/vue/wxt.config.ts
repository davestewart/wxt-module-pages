import { defineConfig } from 'wxt'

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: [
    '@wxt-dev/module-vue',
    'wxt-module-layers',
    'wxt-module-pages',
  ],

  layers: {
    logLevel: 'debug',
  },

  pages: {
    logLevel: 'debug',
  },

  manifest: {
    action: {},
  },
})
