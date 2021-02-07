<template>
  <div id="loginform">
    <v-card class="mx-auto my-12 align-center" max-width="374">
      <v-text-field label="Nome utente" v-model="username"></v-text-field>
      <v-text-field
        label="Password"
        v-model="password"
        :append-icon="showPassword ? 'mdi-eye' : 'mdi-eye-off'"
        :type="showPassword ? 'text' : 'password'"
        @click:append="showPassword = !showPassword"
      >
      </v-text-field>
      <v-btn depressed v-on:click="login">Login</v-btn>
    </v-card>
  </div>
</template>

<script>
export default {
  data() {
    return {
      showPassword: false,
      username: "",
      password: "",
    };
  },
  methods: {
    login() {
      var thisComponent = this;
      console.log("Try to login");
      this.axios
        .post("/adminarea/login", {
          user: {
            username: this.username,
            password: this.password,
          },
        })
        .then((response) => {          
          var user = response.data.user;
          var auth = response.data.auth;
          var token = response.data.token;
                
          // check for autentication
          if (auth && user && user.id!==0 && token && token !== "") {
            //Logged
            localStorage.setItem("user", JSON.stringify(user));
            localStorage.setItem("jwt", token);
            thisComponent.$store.commit("user/account", user);
            thisComponent.$store.commit("user/token", token);
            thisComponent.$store.commit("user/isLogged", true);
          } else {
            //Not logged
            thisComponent.$store.commit("user/account", {});
            thisComponent.$store.commit("user/token", "");
            thisComponent.$store.commit("user/isLogged", false);
          }
        })
        .catch((error) => {
          console.log(error);
        });
    },
    logout() {
      this.$store.commit("user/account", {});
      this.$store.commit("user/token", "");
      this.$store.commit("user/isLogged", false);
    },
  },
};
</script>

<style>
#loginform {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
