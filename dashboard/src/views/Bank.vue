<template>
  <div>
    <v-row>
      <v-col>
        <v-text-field
          v-model="selectedBank.name"
          counter="14"
          hint="inserisci nome del banco"
          label="Nome banco SIM"
        ></v-text-field>
      </v-col>
      <v-col>
        <v-text-field
          v-model="selectedBank.location"
          counter="15"
          hint="Indirizzo collocazione"
          label="Collocazione"
        ></v-text-field>
      </v-col>
      <v-col>
        <v-text-field
          v-model="selectedBank.ip"
          counter="6"
          hint="IP"
          label="IP"
        ></v-text-field>
      </v-col>
      <v-col>
        <v-text-field
          v-model="selectedBank.port"
          counter="10"
          hint="Porta"
          label="Porta"
        ></v-text-field>
      </v-col>
      <v-col>
        <v-text-field
          v-model="selectedBank.nplaces"
          counter="22"
          hint="Posti SIM"
          label="Numero posti SIM"
        ></v-text-field>
      </v-col>            
    </v-row>
    <v-btn classs="primary" @click="insertBank()">Inserisci</v-btn>

    <v-row>
      <v-col>
        <v-data-table
          :headers="headerBanks"
          :items="banks"
          :items-per-page="30"
          class="elevation-1"
        >
          <template v-slot:item="row">
            <tr
              @click="selectBank(row.item)"
              :class="{ primary: row.item.id === selectedBank.id }"
            >
              <td>{{ row.item.id }}</td>
              <td>{{ row.item.name }}</td>
              <td>{{ row.item.location }}</td>
              <td>{{ row.item.ip }}</td>
              <td>{{ row.item.port }}</td>
              <td>{{ row.item.nplaces }}</td>
              <td>
                <v-btn
                  class="mx-4"
                  fab
                  dark
                  x-small
                  color="black"
                  @click="deleteBank(row.item)"
                >
                  <v-icon dark>mdi-delete</v-icon>
                </v-btn>
              </td>
            </tr>
          </template>
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
  },
  data() {
    return {
      headerBanks: [
        { text: "ID", value: "id" },
        { text: "Nome", value: "name" },
        { text: "Collocazione", value: "location" },
        { text: "IP", value: "ip" },
        { text: "Porta", value: "port" },
        { text: "Numero posti SIM", value: "nplaces" },
      ],
      selectedBank: {},      
      banks: [],
    };
  },
  mounted() {
    this.loadBanks();
  },
  methods: {
    async insertBank() {      
      if (
        await this.$refs.neworupdate.open(
          "Nuovo/aggiornamento",
          "Vuoi creare un nuovo banco?"
        )
      ) {
        var newBank={};
        Object.assign(newBank,this.selectedBank); newBank.id="";
        this.axios
        .post("/adminarea/bank/insert", { bank: newBank })
        .then((request) => {
          var bankInserted = request.data.bank;
          if (bankInserted) {
            this.banks.push(bankInserted);
            this.selectedBank = bankInserted;
          }
        });
      } else {
        this.axios
        .post("/adminarea/bank/update", { bank: this.selectedBank })
        .then((request) => {
          var bankInserted = request.data.bank;
          if (bankInserted) {
            this.banks.push(bankInserted);
            this.selectedBank = bankInserted;
          }
        });
      }

      
      
    },
    async deleteBank(bankToDel) {
       if (
        await this.$refs.confirm.open(
          "Conferma cancellazione",
          "Sei sicuro di voler cancellare il Banco?"
        )
      ) {
      this.axios
        .post("/adminarea/bank/delete", { bank: bankToDel })
        .then((request) => {
          var bankDeleted = request.data.bank;
          if (bankDeleted) {
            this.selectedBank = bankDeleted;

            function findById(gat) {
              return gat.id === bankDeleted.id;
            }
            var elem=this.banks.find(findById);
            var index=this.banks.indexOf(elem);            
            if(index>-1) this.banks.splice(index, 1);
            
          }
        });
      }
    },
    selectBank(bank) {      
      this.selectedBank={};
      Object.assign(this.selectedBank, bank);
    },
    loadBanks() {
      this.banks = [];
      this.axios
        .post("/adminarea/bank/getAll")
        .then((request) => {
          if (request.data.banks) {
            this.banks=request.data.banks;            
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
