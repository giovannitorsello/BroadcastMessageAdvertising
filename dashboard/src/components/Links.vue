<template>
  <v-container>
    <v-row align="center">
      <v-col
        v-for="(link, i) in links"
        :key="i"
        class="text-center"
        cols="6"
        md="auto"
      >
        <a
          :href="link.href"
          class="text-decoration-none text-uppercase text-caption font-weight-regular"
          rel="noopener"
          target="_blank"
          v-text="link.text"
        />
      </v-col>

      <v-spacer class="hidden-sm-and-down" />

      <v-col
        cols="12"
        md="auto"
      >
        <div class="body-1 font-weight-light pt-6 pt-md-0 text-center">
          &copy; {{ (new Date()).getFullYear() }}
          <a
            href="https://www.wifinetcom.net"
            class="text-decoration-none"
          >Wifinetcom SRL - Author Giovanni Torsello</a>
        </div>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
  export default {
    name: 'Links',

    data: () => ({
      links: [        
      ],
    }),
  }
</script>

<style lang="sass" scoped>
  a
    color: inherit !important
</style>
