import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import './styles/global.css'
import { setupGlobalAudioUnlock } from './utils/audio'
import './utils/pwaInstall'

setupGlobalAudioUnlock()

createApp(App).use(router).mount('#app')
