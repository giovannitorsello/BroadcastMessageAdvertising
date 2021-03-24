<template>
  <div>
    <p>Inserimento singola scheda</p>
    <v-row>
      <v-col>
        <v-text-field
          v-model="selectedSim.phoneNumber"
          counter="14"
          hint="inserisci numero di telefono"
          label="Numero di Telefono"
        ></v-text-field>
      </v-col>
      <v-col>
        <v-text-field
          v-model="selectedSim.operator"
          counter="14"
          hint="inseriscil'operatore"
          label="Operatore/Compagnia telefonica"
        ></v-text-field>
      </v-col>
      <v-col>
        <v-text-field
          v-model="selectedSim.pin"
          counter="6"
          hint="PIN"
          label="Pin"
        ></v-text-field>
      </v-col>
      <v-col>
        <v-text-field
          v-model="selectedSim.puk"
          counter="10"
          hint="PUK"
          label="Puk"
        ></v-text-field>
      </v-col>
      <v-col>
        <v-text-field
          v-model="selectedSim.iccid"
          counter="22"
          hint="ICCID"
          label="Codice ICCID"
        ></v-text-field>
      </v-col>
      <v-col>
        <v-text-field
          v-model="selectedSim.ean"
          counter="15"
          hint="EAN"
          label="Codice EAN"
        ></v-text-field>
      </v-col>
      <v-col>
        <v-select
          v-model="selectedBank"
          :items="banks"
          label="Banco SIM"
          item-text="name"
          return-object
        >
        </v-select>
      </v-col>
      <v-col>
        <v-btn classs="primary" @click="insertSim()">Inserisci</v-btn>
      </v-col>
    </v-row>
    
    <p>Importazione massiva</p>
    <v-row>
      <v-col>
        <v-select
          v-model="selectedBank"
          :items="banks"
          label="Banco SIM"
          item-text="name"
          return-object
        >
        </v-select>
      </v-col>
      <v-col>
        <v-file-input
          v-on:change="loadCSVFile"
          v-model="fileCSVSim"
          truncate-length="15"
          show-size
          label="Carica il file CSV delle SIM"
        ></v-file-input>
      </v-col> 
      <v-col>
        <v-btn classs="primary" @click="emptySim()" :disabled="!selectedBank.id">Elimina le Sim dal banco</v-btn>
      </v-col>     
    </v-row>
    <v-row>
      <v-col>
        <v-data-table
          :headers="headerSims"
          :items="sims"
          :items-per-page="30"
          class="elevation-1"
        >
          <template v-slot:item="row">
            <tr
              @click="selectSim(row.item)"
              :class="{ primary: row.item.id === selectedSim.id }"
            >
              <td>{{ row.item.id }}</td>
              <td>{{ row.item.name }}</td>
              <td>{{ row.item.phoneNumber }}</td>
              <td>{{ row.item.operator }}</td>
              <td>{{ row.item.bankId }}</td>
              <td>{{ row.item.iicd }}</td>
              <td>{{ row.item.ean }}</td>              
              <td>{{ row.item.pin }}</td>
              <td>{{ row.item.puk }}</td>
              <td>{{ row.item.isWorkingCall }}</td>
              <td>{{ row.item.isWorkingSms }}</td>
              <td>
                <v-btn
                  class="mx-4"
                  fab
                  dark
                  x-small
                  color="black"
                  @click="deleteSim(row.item)"
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
      headerSims: [
        { text: "ID", value: "id" },
        { text: "Nome", value: "name" },
        { text: "Numero Telefono", value: "phoneNumber" },
        { text: "Operatore", value: "operator" },
        { text: "Banco SIM", value: "bankId" },
        { text: "Codice IICD", value: "iicd" },
        { text: "Codice EAN", value: "ean" },
        { text: "Pin", value: "pin" },
        { text: "Puk", value: "puk" },
        { text: "Abilit. Chiamate", value: "isWorkingCall" },
        { text: "Abilit. Sms", value: "isWorkingSms" },
      ],
      selectedSim: {},
      selectedBank: {},
      sims: [],
      banks: [],
      fileCSVSim: "",
    };
  },
  mounted() {
    this.loadSims();
    this.loadBanks();
  },
  methods: {
    async insertSim() {
      var bAccept=await this.$refs.neworupdate.open("Nuova/aggiornamento","Vuoi creare una nuova SIM?")
      if (bAccept) {
        var newSim = {};
        
        Object.assign(newSim, this.selectedSim);        
        newSim.bankId=this.selectedBank.id;        
        newSim.name=newSim.operator+"_"+newSim.phoneNumber;
        newSim.id = "";        
        this.axios
          .post("/adminarea/sim/insert", { sim: newSim })
          .then((request) => {
            var simInserted = request.data.sim;
            if (simInserted) {
              this.sims.push(simInserted);
              this.selectedSim = simInserted;
            }
          });
      } else {
        this.axios
          .post("/adminarea/sim/update", { sim: this.selectedSim })
          .then((request) => {
            var simInserted = request.data.sim;
            if (simInserted) {
              this.selectedSim = simInserted;
            }
          });
      }
    },
    selectSim(sim) {
      this.selectedSim = {};
      Object.assign(this.selectedSim, sim);
    },
    async deleteSim(simToDel) {
      if (
        await this.$refs.confirm.open(
          "Conferma cancellazione",
          "Sei sicuro di voler cancellare la SIM"
        )
      ) {
        this.axios
          .post("/adminarea/sim/delete", { sim: simToDel })
          .then((request) => {
            var simDeleted = request.data.sim;
            if (simDeleted) {
              this.selectedSim = simDeleted;
              function findById(gat) {
                return gat.id === simDeleted.id;
              }
              var elem = this.sims.find(findById);
              var index = this.sims.indexOf(elem);
              if (index > -1) this.sims.splice(index, 1);
            }
          });
      }
    },
    async emptySim() {
      console.log(this.selectedBank);
      var bAccept= await this.$refs.confirm.open(
          "Conferma cancellazione",
          "Sei sicuro di voler cancellare tutte le SIM?"
        );
      if (bAccept) {
        this.axios
          .post("/adminarea/sim/deleteall", {bankId: this.selectedBank.id})
          .then((request) => {
            var result = request.data.result;
            if (result) {
              this.selectedSim = {};
              this.sims=[];   
              this.loadSims();           
            }
          });
      }
    },
    loadSims() {
      this.sims = [];
      this.axios
        .post("/adminarea/sim/getAll")
        .then((request) => {
          if (request.data.sims) {
            this.sims = request.data.sims;
          }
        })
        .catch((error) => {
          console.log(error);
        });
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
    loadCSVFile() {
        var formData = new FormData();
        formData.append("csv_data", this.fileCSVSim);   
        formData.append("bankId", this.selectedBank.id);     
        this.axios
          .post("/upload/sims", formData, {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          })
          .then((request) => {            
            this.loadSims();
          })
          .catch((error) => {
            console.log(error);
          });      
    },
  },
};
</script>

<style></style>
