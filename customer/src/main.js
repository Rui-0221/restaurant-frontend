import { createApp } from 'vue'
import { createPinia } from 'pinia'
import Vant from 'vant'
import 'vant/lib/index.css'
import App from './App.vue'
import router from './router'
import { useUserStore } from './store/user'
import { bindCustomerUnauthorizedLogout } from './utils/unauthorized'
import './styles/main.css'

const app = createApp(App)
app.use(createPinia())
bindCustomerUnauthorizedLogout(useUserStore())
app.use(router)
app.use(Vant)
app.mount('#app')
