// Pathify
import { make } from 'vuex-pathify'

// Data
const state = {
  drawer: null,
  drawerImage: true,
  mini: false,
  items: [
    {
      title: 'Dashboard',
      icon: 'mdi-view-dashboard',
      to: '/',
    },
    {
      title: 'Gestione campagna',
      icon: 'mdi-sign-text',
      to: '/campaign/manage',
    },
    {
      title: 'Statistiche campagna',
      icon: 'mdi-chart-line',
      to: '/campaign/statistics',
    },
    {
      title: 'Check sistema',
      icon: 'mdi-check-all',
      to: '/system/check',
    },
    {
      title: 'Creazione utenti',
      icon: 'mdi-account',
      to: '/system/user',
    }
  ],
}

const mutations = make.mutations(state)

const actions = {
  ...make.actions(state),
  init: async ({ dispatch }) => {
    //
  },
}

const getters = {}

export default {
  namespaced: true,
  state,
  mutations,
  actions,
  getters,
}
