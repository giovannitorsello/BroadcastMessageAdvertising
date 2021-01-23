import 'material-design-icons-iconfont/dist/material-design-icons.css' 
import '@mdi/font/css/materialdesignicons.css'
import '@fortawesome/fontawesome-free/css/all.css'
import App from './App.vue'
import Vue from 'vue'
import VueRouter from 'vue-router'
import LoginComponent from "./components/Login.vue"
import SecureComponent from "./components/Secure.vue"
import vuetify from './plugins/vuetify';
Vue.config.productionTip = false


const routes = [
  {
    path: "/",
    name: "root",
    component: LoginComponent
  },
  {
      path: "/login",
      name: "login",
      component: LoginComponent
  },
  {
      path: "/secure",
      name: "secure",
      component: SecureComponent
  }
]


Vue.use(VueRouter)

const router = new VueRouter({routes})



new Vue({
  render: h => h(App),
  vuetify,
  router: router
}).$mount('#app')