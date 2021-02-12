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
                </div>
              </td>
              <td>{{ row.item.isWorking }}</td>
            </tr>
          </template>
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
      gateways: [],
    };
  },
  mounted() {
    setInterval(() => {
      this.getGateways();
    }, 2000);
  },
  methods: {
    getGateways() {
      this.axios
        .post("/adminarea/gateway/getAll")
        .then((request) => {
          console.log(request.data.gateways);
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
