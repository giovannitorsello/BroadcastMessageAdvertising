<template>
  <div>
    <v-container v-if="!isLogged">
      <Login></Login>
    </v-container>

    <v-app v-if="isLogged">
      <default-bar />

      <default-drawer />

      <default-view />

      <default-footer />

      <default-settings />
    </v-app>
  </div>
</template>

<script>
export default {
  name: "DefaultLayout",
  data() {
    return {
      isLogged: false,
    };
  },
  created() {
    /*this.$on('login', (data) => {
      console.log("Logged in")
      console.log(data);
      this.isLogged = true;
      //this.$emit();
    });
    this.$on('logout', (data) => {
      console.log("Logout from Index.vue");
      this.isLogged = false;
    });*/
  },

  components: {
    Login: () =>
      import(
        /* webpackChunkName: "default-app-bar" */
        "./Login"
      ),
    DefaultBar: () =>
      import(
        /* webpackChunkName: "default-app-bar" */
        "./AppBar"
      ),
    DefaultDrawer: () =>
      import(
        /* webpackChunkName: "default-drawer" */
        "./Drawer"
      ),
    DefaultFooter: () =>
      import(
        /* webpackChunkName: "default-footer" */
        "./Footer"
      ),
    DefaultSettings: () =>
      import(
        /* webpackChunkName: "default-settings" */
        "./Settings"
      ),
    DefaultView: () =>
      import(
        /* webpackChunkName: "default-view" */
        "./View"
      ),
  },
  mounted() {
    this.subscription = this.$store.subscribe((mutation, payload) => {
      
      if(payload.user.isLogged) {
        console.log("Logged in. (From Index.vue)");
        this.isLogged=true;
      }
      else {
        console.log("Log out. (From Index.vue)");
        this.isLogged=false;
      }
      
			if (mutation.type === 'vuetify@user') {
				console.log("Mutation of user")
			}
		});
    
  },
};
</script>
