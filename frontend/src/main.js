import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { Vue3Mq } from 'vue3-mq'
import './style.css'
import './assets/main.css'
import App from './App.vue'
import router from './router'

const app = createApp(App)
const pinia = createPinia()

// Configure vue3-mq with common breakpoints
const mqConfig = {
    global: true,
    breakpoints: {
        xs: 0,
        sm: 576,
        md: 768,
        lg: 992,
        xl: 1200,
        xxl: 1400
    },
    defaultBreakpoint: 'sm' // default breakpoint for SSR
}

app.use(pinia)
app.use(router)
app.use(Vue3Mq, mqConfig)
app.mount('#app')
