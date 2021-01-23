import 'material-design-icons-iconfont/dist/material-design-icons.css' 
import '@mdi/font/css/materialdesignicons.css'
import '@fortawesome/fontawesome-free/css/all.css'
import App from './App.vue'
import Vue from 'vue'
import VueRouter from 'vue-router'
//import LoginComponent from "./components/Login.vue"
//import MainComponent from "./components/Main.vue"
import vuetify from './plugins/vuetify';
import store from './store'
import router from './router'
import { sync } from 'vuex-router-sync'

Vue.config.productionTip = false


/*
const routes = [
  {
    path: "/",
    name: "Root",
    component: MainComponent
  },
  {
      path: "/login",
      name: "Login",
      component: LoginComponent
  },
  {
      path: "/main",
      name: "Main",
      component: MainComponent
  }
]
const router = new VueRouter({routes})
*/

Vue.use(VueRouter)



sync(store, router)

new Vue({
  router,
  vuetify,
  store,
  render: h => h(App),
}).$mount('#app')
