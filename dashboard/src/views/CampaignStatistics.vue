<template>
  <v-container>
    <v-row>
      <v-col>
        <v-data-table
          :headers="headerGateways"
          :items="gateways"
          :items-per-page="30"
          class="elevation-1"
        >
        </v-data-table>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
export default {
   data() {
    return {
      headerGateways: [
        { text: "ID", value: "id" },
        { text: "name", value: "name" },
        { text: "SMS inviati", value: "nSmsSent" },
        { text: "SMS Ricevuti", value: "nSmsReceived" },
        { text: "Connesso", value: "isWorking" },
      ],
      gateways : []
    }
   },
   mounted() {
     setInterval(() => {
       this.getGateways();
     }, 2000);
   },
  methods :{
    getGateways() {
      this.axios
        .post("/adminarea/gateway/getall")
        .then((request) => {
          if (request.data.gateways) {
            this.gateways = request.data.gateways;                    
          }
        })
        .catch((error) => {
          console.log(error);
        });
    }
  }
};
</script>

<style></style>
