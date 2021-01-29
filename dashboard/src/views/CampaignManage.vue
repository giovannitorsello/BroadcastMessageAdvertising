<template>
  <div>
    <v-container>
      <v-tabs v-model="tab">
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
                :items="cities"
                v-model="selectedCity"
                label="Seleziona per Città"
                v-on:change="selectByCity"
              ></v-select>
              <v-select
                :items="provinces"
                v-model="selectedProvince"
                label="Seleziona per Provincia"
                v-on:change="selectByProvince"
              ></v-select>
              <v-select
                :items="states"
                v-model="selectedState"
                label="Seleziona per Regione"
                v-on:change="selectByState"
              ></v-select>
              <v-select
                :items="countries"
                v-model="selectedCountry"
                label="Seleziona per Nazione"
                v-on:change="selectByCountry"
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
        <v-tab-item id="startstop" key="startstop">
          <v-row>
            <v-col>
              <v-text-field
                v-model="messageCampaign.name"
                counter="25"
                hint="Inserisci il nome della campagna"
                label="Nome campagna SMS"
              ></v-text-field>
            </v-col>
          </v-row>
          <v-row>
            <v-col>
              <v-btn depressed color="primary" v-on:click="insertMessageCampaign"
                >Inserisci campagna</v-btn
              >
            </v-col>
          </v-row>
          <v-row>
            <v-col>
              <v-data-table
                  :headers="headerCampaigns"
                  :items="messageCampaigns"
                  :items-per-page="30"
                  class="elevation-1"
                >
                
                <template v-slot:item="row">
                <tr>
                  <td>{{row.item.id}}</td>
                  <td>{{row.item.name}}</td>
                  <td>{{row.item.state}}</td>
                  <td>{{row.item.message}}</td>
                  <td>{{row.item.ncontacts}}</td>
                  <td>{{row.item.ncompleted}}</td>
                  <td>
                    <v-btn class="mx-4" fab dark x-small color="green" @click="startCampaign(row.item)">
                    <v-icon dark>mdi-play</v-icon>
                    </v-btn>
                  </td>
                  <td>
                    <v-btn class="mx-4" fab dark x-small color="red" @click="pauseCampaign(row.item)">
                    <v-icon dark>mdi-pause</v-icon>
                    </v-btn>
                  </td>
                  <td>
                    <v-btn class="mx-4" fab dark x-small color="black" @click="deleteCampaign(row.item)">
                    <v-icon dark>mdi-delete</v-icon>
                    </v-btn>
                  </td>
                </tr>
                </template>
                
                </v-data-table>
            </v-col>
          </v-row>
        </v-tab-item>
      </v-tabs>
    </v-container>
  </div>
</template>

<script>
export default {
  data() {
    return {
      messageCampaign: { name: "", contacts: [], message: {} },

      messageUrl1: "https://www.google.com",
      messageUrl2: "https://www.youtube.com",
      messageText: "Testo di prova (da cambiare) |link1| e |link2|",

      selectedCap: "",
      selectedCity: "",
      selectedState: "",
      selectedProvince: "",
      selectedCountry: "",

      messageCampaigns: [],
      contacts: [],
      caps: [],
      cities: [],
      provinces: [],
      states: [],
      countries: [],

      tab: null,
      fileCSV: [],
      headers: [
        { text: "ID", value: "id" },
        { text: "Nome", value: "firstname" },
        { text: "Cognome", value: "lastname" },
        { text: "Telefono", value: "mobilephone" },
        { text: "Indirizzo", value: "address" },
        { text: "Città", value: "city" },
        { text: "Provincia", value: "adm1" },
        { text: "Regione", value: "adm2" },
        { text: "Stato", value: "adm3" },
        { text: "CAP", value: "postcode" },
      ],

      headerCampaigns: [
        { text: "Codice", value: "id" },
        { text: "Nome campagna", value: "name" },
        { text: "Stato", value: "state" },
        { text: "Messagio", value: "message" },
        { text: "Numero contatti", value: "ncontacts" },
        { text: "Completamento", value: "ncompleted" },
      ],
    };
  },
  mounted() {
    this.refreshAll();
  },
  methods: {
    startCampaign(messageCampaign) {
      messageCampaign.state="active";
      this.axios
        .post("http://localhost:18088/adminarea/messageCampaign/update", {messageCampaign: messageCampaign})
        .then((request) => {          
         this.messageCampaign=request.data.messageCampaign;
        })
        .catch((error) => {
            console.log(error);
        });
    },
    pauseCampaign(messageCampaign) {
      messageCampaign.state="disabled";
      this.axios
        .post("http://localhost:18088/adminarea/messageCampaign/update", {messageCampaign: messageCampaign})
        .then((request) => {
          this.messageCampaign=request.data.messageCampaign;          
        })
        .catch((error) => {
            console.log(error);
        });
    },
    deleteCampaign(messageCampaign) {
      this.axios
        .post("http://localhost:18088/adminarea/messageCampaign/delete", {messageCampaign: messageCampaign})
        .then((request) => {
          this.messageCampaign=request.data.messageCampaign;
          this.getMessageCampaigns();
        })
        .catch((error) => {
            console.log(error);
      });
    },
    insertMessageCampaign() {
      this.axios
        .post("http://localhost:18088/adminarea/messageCampaign/insert", {
          messageCampaign: {
            name:  this.messageCampaign.name,
            contacts: this.contacts,
            message: {text: this.messageText, url1: this.messageUrl1, url2: this.messageUrl2},
          },
        })
        .then((request) => {
          this.messageCampaigns.push(request.data.messageCampaign);
        })
        .catch((error) => {
          console.log(error);
        });
    },
    startMessageCampaign() {      
    },
    stopMessageCampaign() {      
    },
    deleteMessageCampaign() {      
    },
    getMessageCampaigns() {
      this.axios
        .post("http://localhost:18088/adminarea/messageCampaign/getAll")
        .then((request) => {
          if (request.data.messageCampaigns) {
            this.messageCampaigns = request.data.messageCampaigns;   
          }
        })
        .catch((error) => {
          console.log(error);
        });
    },
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
    getCities() {
      this.axios
        .post("http://localhost:18088/adminarea/customer/getCities")
        .then((request) => {
          if (request.data.cities) {
            this.cities = [];
            request.data.cities.forEach((element) => {
              this.cities.push({
                text: element.city,
                value: element.city,
              });
            });
          }
        })
        .catch((error) => {
          console.log(error);
        });
    },
    getProvinces() {
      this.axios
        .post("http://localhost:18088/adminarea/customer/getProvinces")
        .then((request) => {
          console.log(request.data);
          if (request.data.provinces) {
            this.provinces = [];
            request.data.provinces.forEach((element) => {
              this.provinces.push({ text: element.adm1, value: element.adm1 });
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
              this.states.push({ text: element.adm2, value: element.adm2 });
            });
          }
        })
        .catch((error) => {
          console.log(error);
        });
    },
    getCountries() {
      this.axios
        .post("http://localhost:18088/adminarea/customer/getCountries")
        .then((request) => {
          if (request.data.countries) {
            this.countries = [];
            request.data.countries.forEach((element) => {
              this.countries.push({ text: element.adm3, value: element.adm3 });
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
    selectByCity() {
      this.axios
        .post("http://localhost:18088/adminarea/customer/selectByCity", {
          selectedCity: this.selectedCity,
        })
        .then((request) => {
          this.contacts = request.data.customers;
        })
        .catch((error) => {
          console.log(error);
        });
    },
    selectByProvince() {
      this.axios
        .post("http://localhost:18088/adminarea/customer/selectByProvince", {
          selectedProvince: this.selectedProvince,
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
    selectByCountry() {
      this.axios
        .post("http://localhost:18088/adminarea/customer/selectByCountries", {
          selectedCountry: this.selectedCountry,
        })
        .then((request) => {
          this.contacts = request.data.customers;
        })
        .catch((error) => {
          console.log(error);
        });
    },
    getCsvLoadedCustomers() {
      this.axios
        .post("http://localhost:18088/adminarea/customer/getall")
        .then((request) => {
          this.contacts = request.data.customers;
        })
        .catch((error) => {
          console.log(error);
        });
    },
    refreshAll() {
      this.getCaps();
      this.getCities();
      this.getProvinces();
      this.getStates();
      this.getCountries();
      this.getCsvLoadedCustomers();
      this.getMessageCampaigns();
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
          setTimeout(this.refreshAll, 3000);
        })
        .catch((error) => {
          console.log(error);
        });
    },
  },
};
</script>

<style></style>
