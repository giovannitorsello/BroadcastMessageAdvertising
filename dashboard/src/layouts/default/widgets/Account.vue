<template>
  <v-menu
    bottom
    left
    min-width="200"
    offset-y
    origin="top right"
    transition="scale-transition"
  >
    <template v-slot:activator="{ attrs, on }">
      <v-btn class="ml-2" min-width="0" text v-bind="attrs" v-on="on">
        <v-icon>mdi-account</v-icon>
      </v-btn>
    </template>

    <v-list :tile="false" flat nav>
      <template v-for="(p, i) in profile">
        <v-divider v-if="p.divider" :key="`divider-${i}`" class="mb-2 mt-2" />

        <app-bar-item v-else :key="`item-${i}`" to="/">
          <v-list-item-title
            v-text="p.title"
            @click="clickAccountMenuItem(p)"
          />
        </app-bar-item>
      </template>
    </v-list>
  </v-menu>
</template>

<script>
export default {
  name: "DefaultAccount",

  data: () => ({
    profile: [{ id: "1", title: "Esci", action: "logout" }],
  }),
  methods: {
    clickAccountMenuItem(item) {
      var thisComponent=this;
      if (item.action === "logout") {
        this.axios
          .post("/adminarea/logout", {
            user: {
              username: localStorage.getItem("user"),
              token: localStorage.getItem("jwt")
            },
          })
          .then((response) => {            
            localStorage.setItem("user","");
            localStorage.setItem("jwt", "");
            thisComponent.$store.commit('user/account', {});
            thisComponent.$store.commit('user/token', {});
            thisComponent.$store.commit('user/isLogged', false);            
          })
          .catch((error) => {
            console.log(error);
          });
      }
    },
  },
};
</script>
