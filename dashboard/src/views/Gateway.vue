<template>
  <div>
    <v-row>
      <v-col>
        <v-text-field
          v-model="selectedGateway.name"
          counter="14"
          hint="inserisci nome del gateway"
          label="Nome"
        ></v-text-field>
      </v-col>
      <v-col>
        <v-text-field
          v-model="selectedGateway.operator"
          counter="14"
          hint="inserisci l'operatore"
          label="Operatore"
        ></v-text-field>
      </v-col>
      <v-col>
        <v-text-field
          v-model="selectedGateway.location"
          counter="15"
          hint="Indirizzo collocazione"
          label="Collocazione"
        ></v-text-field>
      </v-col>
      <v-col>
        <v-select
          v-model="selectedGateway.bankId"
          :items="banks"
          label="Banco SIM"
          item-text="name"
          item-value="id"
        >
        </v-select>
      </v-col>
      <v-col>
        <v-text-field
          v-model="selectedGateway.nRadios"
          counter="15"
          hint="linee"
          label="Numero totale linee uscita"
        ></v-text-field>
      </v-col>
    </v-row>
    <v-row>
      <v-col>
        <v-text-field
          v-model="selectedGateway.ip"
          counter="6"
          hint="IP"
          label="IP"
        ></v-text-field>
      </v-col>
      <v-col>
        <v-text-field
          v-model="selectedGateway.port"
          counter="10"
          hint="Porta"
          label="Porta"
        ></v-text-field>
      </v-col>
      <v-col>
        <v-text-field
          v-model="selectedGateway.login"
          counter="22"
          hint="username"
          label="Login"
        ></v-text-field>
      </v-col>
      <v-col>
        <v-text-field
          v-model="selectedGateway.password"
          counter="22"
          hint="password"
          label="Password"
        ></v-text-field>
      </v-col>
    </v-row>
    <v-row>
      <v-col>
        <v-text-field
          v-model="selectedGateway.nMaxDailyMessagePerLine"
          counter="22"
          hint="numero massimo di messaggi giornalieri per SIM"
          label="Max SMS per SIM giornalieri"
        ></v-text-field>
        <v-text-field
          v-model="selectedGateway.nMaxSentPercetage"
          counter="22"
          hint="percentuale massima di invio messaggi"
          label="Percentuale massima di invio SMS"
        ></v-text-field>
      </v-col>
      <v-col>
        <v-text-field
          v-model="selectedGateway.nMaxDailyCallPerLine"
          counter="22"
          hint="massimo minuti di chiamate per SIM"
          label="Max minuti chiamate giornalieri per SIM"
        ></v-text-field>
        <v-text-field
          v-model="selectedGateway.nMaxCallPercetage"
          counter="22"
          hint="percentuale massima di chiamete in uscita"
          label="Percentuale massima di chiamate in uscita"
        ></v-text-field>
      </v-col>
    </v-row>
    <v-row>
      <v-col>
        <v-btn class="primary" @click="insertGateway()"
          >Inserisci/Aggiorna</v-btn
        >
        <v-btn classs="primary" @click="insertSimInGateway()"
          >Carica sim nei gateway</v-btn
        >
      </v-col>
    </v-row>

    <v-row>
      <v-col>
        <v-data-table
          :headers="headerGateways"
          :items="gateways"
          :items-per-page="30"
          :sort-by="['id']"
          :sort-desc="[false]"
          class="elevation-1"
        >
          <template v-slot:item="row">
            <tr
              @click="selectGateway(row.item)"
              :class="{ primary: row.item.id === selectedGateway.id }"
            >
              <td>{{ row.item.id }}</td>
              <td>{{ row.item.name }}</td>
              <td>{{ row.item.operator }}</td>
              <td>{{ row.item.location }}</td>
              <td>{{ row.item.bankId }}</td>
              <td>{{ row.item.nRadios }}</td>
              <td>{{ row.item.ip }}</td>
              <td>{{ row.item.port }}</td>
              <td>{{ row.item.login }}</td>
              <td>{{ row.item.password }}</td>
              <td>
                <v-btn @click="toggleWorkingCall(row.item)">{{
                  row.item.isWorkingCall
                }}</v-btn>
                --
                <v-btn @click="toggleWorkingSms(row.item)">{{
                  row.item.isWorkingSms
                }}</v-btn>
              </td>
              <td>{{ row.item.nMaxDailyMessagePerLine }}</td>
              <td>{{ row.item.nMaxSentPercetage }}</td>
              <td>{{ row.item.nMaxDailyCallPerLine }}</td>
              <td>{{ row.item.nMaxCallPercetage }}</td>
              <td>
                <v-btn
                  class="mx-4"
                  fab
                  dark
                  x-small
                  color="black"
                  @click="deleteGateway(row.item)"
                >
                  <v-icon dark>mdi-delete</v-icon>
                </v-btn>
              </td>
            </tr>
          </template>
        </v-data-table>
      </v-col>
    </v-row>

    <v-card>
      <p>Numeri di telefono</p>
      <template>
        <v-row v-if="selectedGateway && selectedGateway.objData">
          <v-col
            v-for="(line, index) in selectedGateway.objData.lines"
            v-bind:key="line"
          >
            <LineManage
              :lineObject="{ gateway: selectedGateway, line: index }"
            ></LineManage>
          </v-col>
        </v-row>
      </template>
    </v-card>

    <v-row>
      <v-col>
        <p>Servizi di invio internet</p>
        <v-data-table
          :headers="headerInternetGateways"
          :items="internetGateways"
          :items-per-page="30"
          class="elevation-1"
        >
        </v-data-table>
      </v-col>
    </v-row>


    <ConfirmDlg ref="confirm" />
    <NewOrUpdateDlg ref="neworupdate" />
  </div>
</template>

<script>
export default {
  components: {
    ConfirmDlg: () => import("./ConfirmDlg"),
    NewOrUpdateDlg: () => import("./NewOrUpdateDlg"),
    LineManage: () => import("../components/LineManage"),
  },
  data() {
    return {
      headerGateways: [
        { text: "ID", value: "id" },
        { text: "Nome", value: "name" },
        { text: "Operatore", value: "operator" },
        { text: "Collocazione", value: "location" },
        { text: "Banco Sim", value: "bankId" },
        { text: "Numero Linee", value: "nRadios" },
        { text: "IP", value: "ip" },
        { text: "Porta", value: "port" },
        { text: "Login", value: "login" },
        { text: "Password", value: "password" },
        {
          text: "Abilitazione Chiamate - Sms",
          value: "isWorkingCall",
        },
        {
          text: "Messaggi per linea giornalieri",
          value: "nMaxDailyMessagePerLine",
        },
        { text: "Percentuale di invio", value: "nMaxSentPercetage" },
        {
          text: "Chiamate per linea giornaliere",
          value: "nMaxDailyCallPerLine",
        },
        { text: "Percentuale chiamatein uscita", value: "nMaxCallPercetage" },
      ],
      headerInternetGateways: [
        { text: "ID", value: "id" },
        { text: "Nome", value: "name" },
        { text: "Messaggi rimanenti", value: "credit" },
      ],
      selectedGateway: {},
      selectedLine: {},
      gateways: [],
      internetGateways: [],
      banks: [],
    };
  },
  mounted() {
    this.loadBanks();
    this.loadGateways();
    this.loadInternetGateways();
  },
  computed: {},
  methods: {
    toggleWorkingCall(gateway) {
      gateway.isWorkingCall = !gateway.isWorkingCall;
      this.updateGateway(gateway);
    },
    toggleWorkingSms(gateway) {
      gateway.isWorkingSms = !gateway.isWorkingSms;
      this.updateGateway(gateway);
    },
    async insertSimInGateway() {
      if (
        await this.$refs.confirm.open(
          "Conferma riprogrammazione",
          "Tutti i contatori saranno azzzerati. Sei sicuro di voler riprogrammare i gateways con le sim?"
        )
      ) {
        this.axios.post("/adminarea/gateway/resetAll", {}).then((request) => {
          this.gateways = request.data.gateways;
        });
      }
    },
    async insertGateway() {
      if (
        await this.$refs.neworupdate.open(
          "Nuova/aggiornamento",
          "Vuoi creare un nuovo gateway?"
        )
      ) {
        var newGateway = {};
        Object.assign(newGateway, this.selectedGateway);
        newGateway.id = "";
        this.axios
          .post("/adminarea/gateway/insert", { gateway: newGateway })
          .then((request) => {
            var gatewayInserted = request.data.gateway;
            if (gatewayInserted) {
              this.gateways.push(gatewayInserted);
              this.selectedGateway = gatewayInserted;
            }
          });
      } else {
        this.axios
          .post("/adminarea/gateway/update", { gateway: this.selectedGateway })
          .then((request) => {
            var gatewayInserted = request.data.gateway;
            if (gatewayInserted) {
              this.selectedGateway = gatewayInserted;
              this.loadGateways();
            }
          });
      }
    },
    async deleteGateway(gatToDel) {
      if (
        await this.$refs.confirm.open(
          "Conferma cancellazione",
          "Sei sicuro di voler cancellare il gateway?"
        )
      ) {
        this.axios
          .post("/adminarea/gateway/delete", { gateway: gatToDel })
          .then((request) => {
            var gatewayDeleted = request.data.gateway;
            if (gatewayDeleted) {
              this.selectedGateway = gatewayDeleted;

              function findById(gat) {
                return gat.id === gatewayDeleted.id;
              }
              var elem = this.gateways.find(findById);
              var index = this.gateways.indexOf(elem);
              if (index > -1) this.gateways.splice(index, 1);
            }
          });
      }
    },
    updateGateway(gatToUpdate) {
      this.axios
        .post("/adminarea/gateway/update", { gateway: gatToUpdate })
        .then((request) => {
          var gatewayUpdated = request.data.gateway;
          if (gatewayUpdated) {
            this.selectedGateway = gatewayUpdated;
            this.loadGateways();
          }
        });
    },
    selectGateway(gat) {
      this.selectedGateway = gat;
    },
    loadBanks() {
      this.banks = [];
      this.axios
        .post("/adminarea/bank/getAll")
        .then((request) => {
          if (request.data.banks) {
            this.banks = request.data.banks;
          }
        })
        .catch((error) => {
          console.log(error);
        });
    },
    loadGateways() {
      this.gateways = [];
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
    loadInternetGateways() {
      this.internetGateways = [];
      this.axios
        .post("/adminarea/internetGateway/getall")
        .then((request) => {
          if (request.data.internetGateways) {
            this.internetGateways = request.data.internetGateways;
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
