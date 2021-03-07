// Imports
import Vue from 'vue'
import Router from 'vue-router'
import { trailingSlash } from '@/util/helpers'
import {
  layout,
  route,
} from '@/util/routes'

Vue.use(Router)

const router = new Router({
  mode: 'history',
  base: process.env.BASE_URL,
  scrollBehavior: (to, from, savedPosition) => {
    if (to.hash) return { selector: to.hash }
    if (savedPosition) return savedPosition
    return { x: 0, y: 0 }
  },
  routes: [
    layout('Default', [
      //route('Dashboard'),
      // Pages
      route('CampaignManage', null, 'campaign/manage'),
      route('CampaignStatistics', null, 'campaign/statistics'),
      route('Sim', null, 'system/sim'),
      route('Bank', null, 'system/bank'),
      route('Gateway', null, 'system/gateway'),
      route('SystemCheck', null, 'system/check'),
      route('SystemUsers', null, 'system/user'),

      // Components
      route('Notifications', null, 'components/notifications'),
      route('Icons', null, 'components/icons'),
      route('Typography', null, 'components/typography'),

      // Tables
      //route('Regular Tables', null, 'tables/regular'),

      // Maps
      //route('Google Maps', null, 'maps/google'),
    ]),
  ],
})


router.beforeEach((to, from, next) => {  
  if(to.matched.some(record => record.meta.requiresAuth)) {
      if (localStorage.getItem('jwt') == null) {
        return to.path.endsWith('/') ? next() : next(trailingSlash(to.path))      
      } else {
          let user = JSON.parse(localStorage.getItem('user'))
          next();
      }
  } else if(to.matched.some(record => record.meta.guest)) {
      if(localStorage.getItem('jwt') == null){
          next()
      }
      else{
          next({ name: 'userboard'})
      }
  }else {
      next()
  }
})


export default router
