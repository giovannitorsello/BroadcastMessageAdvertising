<template>
  <v-container>
    <v-row>
      <v-col>
        <v-btn color="primary" v-on:click="getGateways">Aggiorna</v-btn>
      </v-col>
    </v-row>
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
                    :key="'smsSent'+ i"
                    >|{{ sms }}|</span
                  >
                  <br />
                  <span
                    style="color: green;"
                    v-for="(calls, i) in row.item.objData.callsSent"
                    :key="'callSent'+ i"
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
                    :key="'smsReceived'+ i"
                    >|{{ sms }}|</span
                  >
                  <br />
                  <span
                    style="color: green;"
                    v-for="(calls, i) in row.item.objData.callsReceived"
                    :key="'callReceived'+ i"
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
        <v-btn color="primary" v-on:click="resetCountersSMS"
          >Azzera contatori SMS</v-btn
        >
        <v-btn color="primary" v-on:click="resetCountersCalls"
          >Azzera contatori chiamate</v-btn
        >
        <v-btn color="primary" v-on:click="resetAll"
          >Ripristina tutto</v-btn
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
      resetCountersSMS() {
        this.axios
          .post("/adminarea/gateway/resetCountersSMS")
          .then((request) => {
            if (request.data.gateways) {
              this.gateways = request.data.gateways;
            }
          })
          .catch((error) => {
            console.log(error);
          });
      },
      resetCountersCalls() {
        this.axios
          .post("/adminarea/gateway/resetCountersCalls")
          .then((request) => {
            if (request.data.gateways) {
              this.gateways = request.data.gateways;
            }
          })
          .catch((error) => {
            console.log(error);
          });
      },
      resetAll() {
        this.axios
          .post("/adminarea/gateway/resetAll")
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
