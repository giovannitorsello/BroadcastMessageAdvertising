<template>
  <div id="loginform">
    <v-card class="mx-auto my-12 align-center" max-width="374">
      <v-text-field label="Nome utente" v-model="username"></v-text-field>
      <v-text-field label="Password" 
        v-model="password" 
        :append-icon="showPassword ? 'mdi-eye' : 'mdi-eye-off'"        
        :type="showPassword ? 'text' : password">
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
          console.log(response.data.token);
          localStorage.setItem("user", JSON.stringify(response.data.user));
          localStorage.setItem("jwt", response.data.token);

          if (localStorage.getItem("jwt") != null) {
            //thisComponent.$parent.$emit('login', response.data);
            thisComponent.$store.commit("user/account", response.data.user);
            thisComponent.$store.commit("user/token", response.data.token);
            thisComponent.$store.commit("user/isLogged", true);
          }
        })
        .catch((error) => {
          console.log(error);
        });
    },
    logout() {},
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
