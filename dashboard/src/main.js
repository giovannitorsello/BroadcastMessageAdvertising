import Vue from 'vue'
import App from './App.vue'
import router from './router'
import vuetify from './plugins/vuetify'
import './plugins'
import store from './store'
import { sync } from 'vuex-router-sync'
import axios from 'axios'
import VueAxios from 'vue-axios'


const axiosInstance = axios.create({
  baseURL: process.env.VUE_APP_API_BASE_URL,
});
export default axiosInstance;
console.log("APP API BASE URL")
console.log(process.env.VUE_APP_API_BASE_URL);

Vue.use(VueAxios, axiosInstance)
Vue.config.productionTip = false

sync(store, router)

new Vue({
  router,
  vuetify,
  store,
  render: h => h(App),
}).$mount('#app')
