<template>
  <div>
    <v-container>
      <v-tabs v-model="tab">
        <v-tab href="#select">
          <v-card flat>
            <v-card-text>Selezione contatti</v-card-text>
          </v-card>
        </v-tab>
        <v-tab-item id="select" key="select">
          <v-row>
            <v-col>
              <v-select
                :items="caps"
                v-model="selectedCap"
                label="Seleziona per CAP"
                v-on:change="selectByCap"
              ></v-select>
              <v-select
                :items="states"
                v-model="selectedState"
                label="Seleziona per Regione"
                v-on:change="selectByState"
              ></v-select>
            </v-col>
          </v-row>
          <v-row>
            <v-col>
              <v-data-table
                :headers="headers"
                :items="contacts"
                :items-per-page="30"
                class="elevation-1"
              ></v-data-table>
            </v-col>
          </v-row>
        </v-tab-item>

        <v-tab href="#message">
          <v-card flat>
            <v-card-text>Inserimento Messaggio</v-card-text>
          </v-card>
        </v-tab>
        <v-tab-item id="message" key="message">
          <v-row>
            <v-col>
              <v-textarea
                name="input-7-1"
                filled
                label="Messaggio"
                auto-grow
                counter
                v-model="messageText"
              ></v-textarea>
              <v-text-field
                name="input-7-1"
                filled
                label="Link n.1"                                
                v-model="messageUrl1"
              ></v-text-field>
              <v-text-field
                name="input-7-1"
                filled
                label="Link n.2"                                
                v-model="messageUrl2"
              ></v-text-field>
            </v-col>
          </v-row>
        </v-tab-item>

        <v-tab href="#startstop">
          <v-card flat>
            <v-card-text>Start/Stop</v-card-text>
          </v-card>
        </v-tab>
        <v-tab-item id="startstop" key="startstop"></v-tab-item>

        <v-tab href="#uploadcontacts">
          <v-card flat>
            <v-card-text>Caricamento contatti</v-card-text>
          </v-card>
        </v-tab>
        <v-tab-item id="uploadcontacts" key="uploadcontacts">
          <v-card>
            <v-row>
              <v-col>
                <v-file-input
                  v-on:change="loadCSVFile"
                  v-model="fileCSV"
                  truncate-length="15"
                  show-size
                  label="Carica il file CSV dei contatti"
                ></v-file-input>
              </v-col>
            </v-row>
            <v-row>
              <v-col>
                <v-data-table
                  :headers="headers"
                  :items="contacts"
                  :items-per-page="30"
                  class="elevation-1"
                ></v-data-table>
              </v-col>
            </v-row>
          </v-card>
        </v-tab-item>
      </v-tabs>
    </v-container>
  </div>
</template>

<script>
export default {
  data() {
    return {
      messageUrl1: "",
      messageUrl2: "",
      messageText: "",
      selectedCap: "",
      selectedState: "",
      tab: null,
      fileCSV: [],
      headers: [
        { text: "ID", value: "id" },
        { text: "Nome", value: "firstname" },
        { text: "Cognome", value: "lastname" },
        { text: "Telefono", value: "mobilephone" },
        { text: "Città", value: "city" },
        { text: "Indirizzo", value: "address" },
        { text: "Regione", value: "state" },
        { text: "CAP", value: "postcode" },
      ],
      contacts: [],
      caps: [],
      states: [],
    };
  },
  mounted() {
    this.getCaps();
    this.getStates();
  },
  methods: {
    getCaps() {
      this.axios
        .post("http://localhost:18088/adminarea/customer/getCaps")
        .then((request) => {
          if (request.data.caps) {
            this.caps = [];
            request.data.caps.forEach((element) => {
              this.caps.push({
                text: element.postcode + " -- " + element.city,
                value: element.postcode,
              });
            });
          }
        })
        .catch((error) => {
          console.log(error);
        });
    },
    getStates() {
      this.axios
        .post("http://localhost:18088/adminarea/customer/getStates")
        .then((request) => {
          if (request.data.states) {
            this.states = [];
            request.data.states.forEach((element) => {
              this.states.push({ text: element.state, value: element.state });
            });
          }
        })
        .catch((error) => {
          console.log(error);
        });
    },
    selectByCap() {
      this.axios
        .post("http://localhost:18088/adminarea/customer/selectByCap", {
          selectedCap: this.selectedCap,
        })
        .then((request) => {
          this.contacts = request.data.customers;
        })
        .catch((error) => {
          console.log(error);
        });
    },
    selectByState() {
      this.axios
        .post("http://localhost:18088/adminarea/customer/selectByState", {
          selectedState: this.selectedState,
        })
        .then((request) => {
          this.contacts = request.data.customers;
        })
        .catch((error) => {
          console.log(error);
        });
    },
    loadCSVFile() {
      console.log(this.fileCSV);
      var formData = new FormData();
      formData.append("csv_data", this.fileCSV);

      this.axios
        .post("http://localhost:18088/upload/contacts", formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        })
        .then((request) => {
          this.contacts = request.data.customers;
        })
        .catch((error) => {
          console.log(error);
        });
    },
  },
};
</script>

<style></style>
