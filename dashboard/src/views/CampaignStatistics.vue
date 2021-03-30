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
          <template v-slot:item="row">
            <tr>
              <td>{{ row.item.id }}</td>
              <td>{{ row.item.name }} - {{ row.item.operator }}</td>
              <td>
                <div>
                  {{ row.item.nSmsSent }}
                  <br />
                  <span
                    v-for="(sms, i) in row.item.objData.smsSent"
                    v-bind:key="i"
                    >|{{ sms }}|</span
                  >
                  <br />
                  <span  style="color: green;"
                    v-for="(calls, i) in row.item.objData.callsSent"
                    v-bind:key="i"
                    >|{{ calls }}|</span
                  >
                </div>
              </td>
              <td>
                <div>
                  {{ row.item.nSmsReceived }}
                  <br />
                  <span
                    v-for="(sms, i) in row.item.objData.smsReceived"
                    v-bind:key="i"
                    >|{{ sms }}|</span
                  >
                  <br />
                  <span  style="color: green;"
                    v-for="(calls, i) in row.item.objData.callsReceived"
                    v-bind:key="i"
                    >|{{ calls }}|</span
                  >
                </div>
              </td>
              <td>{{ row.item.isWorking }}</td>
            </tr>
          </template>
        </v-data-table>
      </v-col>
    </v-row>
    <v-row>
      <v-col>
        <v-btn color="primary" v-on:click="getGateways"
          >Aggiorna</v-btn
        >
        <v-btn color="primary" v-on:click="resetCounters"
          >Azzera i contatori</v-btn
        >
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
      gateways: [],
    };
  },
  mounted() {
    setInterval(() => {
      this.getGateways();
    }, 10000);
  },
  methods: {
    resetCounters() {
      this.axios
        .post("/adminarea/gateway/resetCounters")
        .then((request) => {          
          if (request.data.gateways) {
            this.gateways = request.data.gateways;
          }
        })
        .catch((error) => {
          console.log(error);
        });
    },
    getGateways() {
      this.axios
        .post("/adminarea/gateway/getAll")
        .then((request) => {          
          if (request.data.gateways) {
            this.gateways = request.data.gateways;
          }
        })
        .catch((error) => {
          console.log(error);
        });
    },
  },
};
</script>

<style></style>
