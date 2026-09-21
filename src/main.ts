import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import './styles/global.css'
import './utils/pwaInstall'

createApp(App).use(router).mount('#app')
