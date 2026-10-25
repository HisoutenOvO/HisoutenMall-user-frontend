import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import'@/styles/variable.scss'
import '@/styles/global.css'
import 'element-plus/dist/index.css'
import ElementPlus from 'element-plus'


const app = createApp(App)
app.use(createPinia())
app.use(ElementPlus)
app.use(router)
app.mount('#app')