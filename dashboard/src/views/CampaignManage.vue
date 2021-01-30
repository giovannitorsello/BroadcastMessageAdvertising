<template>
  <div>
    <v-container>
      <v-tabs v-model="tab">
        <v-tab href="#startstop">
          <v-card flat>
            <v-card-text>Start/Stop</v-card-text>
          </v-card>
        </v-tab>
        <v-tab-item id="startstop" key="startstop">
          <v-row>
            <v-col>
              <v-text-field
                v-model="campaignName"
                counter="25"
                hint="Inserisci il nome della campagna"
                label="Nome campagna SMS"
              ></v-text-field>
            </v-col>

            <v-col cols="12" lg="6">
              <v-menu
                ref="menuDate"
                v-model="menuDate"
                :close-on-content-click="false"
                transition="scale-transition"
                offset-y
                max-width="290px"
                min-width="auto"
              >
                <template v-slot:activator="{ on, attrs }">
                  <v-text-field
                    v-model="beginDate"
                    label="Scegli la data"
                    hint="MM/DD/YYYY format"
                    persistent-hint
                    prepend-icon="mdi-calendar"
                    v-bind="attrs"
                    @blur="date = parseDate(beginDate)"
                    v-on="on"
                  ></v-text-field>
                </template>
                <v-date-picker
                  v-model="date"
                  no-title
                  @input="menuDate = false"
                ></v-date-picker>
              </v-menu>
            </v-col>

            <v-col>
              <v-menu
                ref="menuTime"
                v-model="menuTime"
                :close-on-content-click="false"
                :nudge-right="40"
                :return-value.sync="time"
                transition="scale-transition"
                offset-y
                max-width="290px"
                min-width="290px"
              >
                <template v-slot:activator="{ on, attrs }">
                  <v-text-field
                    v-model="beginTime"
                    label="Scegli l'orario"
                    prepend-icon="mdi-clock-time-four-outline"
                    readonly
                    v-bind="attrs"
                    v-on="on"
                  ></v-text-field>
                </template>
                <v-time-picker
                  v-if="menuTime"
                  v-model="time"
                  full-width
                  @click:minute="saveTime(time)"
                ></v-time-picker>
              </v-menu>
            </v-col>
          </v-row>

          <v-row>
            <v-col>
              <v-btn
                depressed
                color="primary"
                v-on:click="insertMessageCampaign"
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
                  <tr @click="selectCampaign(row.item)">
                    <td>{{ row.item.id }}</td>
                    <td>{{ row.item.name }}</td>
                    <td>{{ row.item.state }}</td>
                    <td>{{ row.item.message }}</td>
                    <td>{{ row.item.ncontacts }}</td>
                    <td>{{ row.item.ncompleted }}</td>
                    <td>{{ row.item.begin }}</td>
                    <td>{{ row.item.end }}</td>
                    <td>
                      <v-btn
                        class="mx-4"
                        fab
                        dark
                        x-small
                        color="green"
                        @click="startCampaign(row.item)"
                      >
                        <v-icon dark>mdi-play</v-icon>
                      </v-btn>
                    </td>
                    <td>
                      <v-btn
                        class="mx-4"
                        fab
                        dark
                        x-small
                        color="red"
                        @click="pauseCampaign(row.item)"
                      >
                        <v-icon dark>mdi-pause</v-icon>
                      </v-btn>
                    </td>
                    <td>
                      <v-btn
                        class="mx-4"
                        fab
                        dark
                        x-small
                        color="black"
                        @click="deleteCampaign(row.item)"
                      >
                        <v-icon dark>mdi-delete</v-icon>
                      </v-btn>
                    </td>
                  </tr>
                </template>
              </v-data-table>
            </v-col>
          </v-row>
        </v-tab-item>

        <v-tab href="#message">
          <v-card flat>
            <v-card-text>Inserimento Messaggio</v-card-text>
          </v-card>
        </v-tab>
        <v-tab-item v-if="selectedCampaign.id" id="message" key="message">
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
          <v-row>
            <v-col>
              <v-btn
                depressed
                color="primary"
                v-on:click="updateMessageCampaign"
                >Salva campagna</v-btn
              >
            </v-col>
          </v-row>
        </v-tab-item>

        <v-tab href="#uploadcontacts">
          <v-card flat>
            <v-card-text>Contatti</v-card-text>
          </v-card>
        </v-tab>
        <v-tab-item
          v-if="selectedCampaign.id"
          id="uploadcontacts"
          key="uploadcontacts"
        >
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
                <v-btn
                  depressed
                  color="primary"
                  v-on:click="updateMessageCampaign"
                  >Salva campagna</v-btn
                >
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
            <v-card-text>Filtro contatti</v-card-text>
          </v-card>
        </v-tab>
        <v-tab-item v-if="selectedCampaign.id" id="select" key="select">
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
              <v-btn
                depressed
                color="primary"
                v-on:click="filterContactsCampaign"
                >Applica filtro alla campagna</v-btn
              >
            </v-col>
          </v-row>
          <v-row>
            <v-col>
              <v-data-table
                :headers="headers"
                :items="filteredContacts"
                :items-per-page="30"
                class="elevation-1"
              ></v-data-table>
            </v-col>
          </v-row>
        </v-tab-item>

        <v-tab href="#interestedcustomers">
          <v-card flat>
            <v-card-text>Clienti interessati</v-card-text>
          </v-card>
        </v-tab>
        <v-tab-item
          v-if="selectedCampaign.id"
          id="interestedcustomers"
          key="interestedcustomers"
        >
          <v-row>
            <v-col>
              <v-data-table
                :headers="headersInterestedCustomers"
                :items="interestedCustomers"
                :items-per-page="30"
                class="elevation-1"
              >
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
      campaignName: "",
      messageUrl1: "https://www.google.com",
      messageUrl2: "https://www.youtube.com",
      messageText: "Testo di prova (da cambiare) |link1| e |link2|",
      beginDate: "",
      beginTime: "",
      date: new Date().toISOString().substr(0, 10),
      time: "",
      menuDate: false,
      menuTime: false,

      selectedCap: "",
      selectedCity: "",
      selectedState: "",
      selectedProvince: "",
      selectedCountry: "",
      selectedCampaign: { name: "", contacts: [], message: {} },

      messageCampaigns: [],
      contacts: [],
      filteredContacts: [],
      links: [],
      interestedCustomers: [],
      caps: [],
      cities: [],
      provinces: [],
      states: [],
      countries: [],

      tab: null,
      fileCSV: [],
      headers: [
        { text: "ID", value: "id" },
        { text: "Stato", value: "state" },
        { text: "Campagna", value: "campaignId" },
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
      headersInterestedCustomers: [
        { text: "ID", value: "id" },
        { text: "Url", value: "url" },
        { text: "Nome", value: "firstname" },
        { text: "Cognome", value: "lastname" },
        { text: "Telefono", value: "mobilephone" },
        { text: "Indirizzo", value: "address" },
      ],
      headerCampaigns: [
        { text: "Codice", value: "id" },
        { text: "Nome campagna", value: "name" },
        { text: "Stato", value: "state" },
        { text: "Messagio", value: "message" },
        { text: "Numero contatti", value: "ncontacts" },
        { text: "Completamento", value: "ncompleted" },
        { text: "Inizio", value: "begin" },
        { text: "Fine", value: "end" },
      ],
    };
  },
  mounted() {
    this.beginDate=(new Date()).toLocaleDateString("it-IT");
    this.beginTime=(new Date()).toLocaleTimeString("it-IT");
    this.refreshAll();
    setInterval(() => {
      this.refreshAll();
    }, 10000);
  },
  methods: {
    startCampaign(messageCampaign) {
      this.axios
        .post("http://localhost:18088/adminarea/messageCampaign/start", {
          messageCampaign: messageCampaign,
        })
        .then((request) => {
          this.selectedCampaign = request.data.messageCampaign;
          this.getMessageCampaigns();
        })
        .catch((error) => {
          console.log(error);
        });
    },
    pauseCampaign(messageCampaign) {
      this.axios
        .post("http://localhost:18088/adminarea/messageCampaign/pause", {
          messageCampaign: messageCampaign,
        })
        .then((request) => {
          this.selectedCampaign = request.data.messageCampaign;
          this.getMessageCampaigns();
        })
        .catch((error) => {
          console.log(error);
        });
    },
    deleteCampaign(messageCampaign) {
      this.axios
        .post("http://localhost:18088/adminarea/messageCampaign/delete", {
          messageCampaign: messageCampaign,
        })
        .then((request) => {
          this.messageCampaign = request.data.messageCampaign;
          this.getMessageCampaigns();
        })
        .catch((error) => {
          console.log(error);
        });
    },
    selectCampaign(campaign) {
      if (campaign.id > 0) {
        this.selectedCampaign = campaign;
        this.axios
          .post(
            "http://localhost:18088/adminarea/messageCampaign/getCampaign",
            { messageCampaign: campaign }
          )
          .then((request) => {
            if (request.data.messageCampaign) {
              this.selectedCampaign = request.data.messageCampaign;
              if (this.selectedCampaign.contacts)
                this.contacts = this.selectedCampaign.contacts;

              if (this.selectedCampaign.links) {
                this.links = this.selectedCampaign.links;
                this.messageUrl1 = this.links[0].urlOriginal;
                this.messageUrl2 = this.links[1].urlOriginal;
              }

              if (this.selectedCampaign.message)
                this.messageText = this.selectedCampaign.message;
            }
          })
          .catch((error) => {
            console.log(error);
          });
      }
    },
    insertMessageCampaign() {
      this.contacts = [];
      this.axios
        .post("http://localhost:18088/adminarea/messageCampaign/insert", {
          messageCampaign: {
            name: this.campaignName,
            ncontacts: this.contacts.length,
            begin: this.getBeginDate(),
            message: {
              text: this.messageText,
              url1: this.messageUrl1,
              url2: this.messageUrl2,
            },
          },
        })
        .then((request) => {
          this.selectedCampaign = request.data.messageCampaign;
          this.messageCampaigns.push(request.data.messageCampaign);
          console.log("Campaign inserted");
          console.log(this.selectedCampaign);
        })
        .catch((error) => {
          console.log(error);
        });
    },
    updateMessageCampaign() {
      this.axios
        .post("http://localhost:18088/adminarea/messageCampaign/update", {
          messageCampaign: {
            id: this.selectedCampaign.id,
            name: this.selectedCampaign.name,
            state: this.selectedCampaign.state,
            contacts: this.contacts,
            ncontacts: this.contacts.length,

            message: {
              text: this.messageText,
              url1: this.messageUrl1,
              url2: this.messageUrl2,
            },
          },
        })
        .then((request) => {
          this.refreshAll();
        })
        .catch((error) => {
          console.log(error);
        });
    },
    filterContactsCampaign() {
      this.contacts = this.filteredContacts;
      this.updateMessageCampaign();
    },
    getMessageCampaigns() {
      this.messageCampaigns=[]
      this.axios
        .post("http://localhost:18088/adminarea/messageCampaign/getAll")
        .then((request) => {
          if (request.data.messageCampaigns) {            
            request.data.messageCampaigns.forEach(camp => {              
              camp.begin=(new Date(camp.begin)).toLocaleString('it-IT');
              camp.end=(new Date(camp.end)).toLocaleString('it-IT');              
              this.messageCampaigns.push(camp);  
            })
            
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
          this.filteredContacts = request.data.customers;
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
          this.filteredContacts = request.data.customers;
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
          this.filteredContacts = request.data.customers;
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
          this.filteredContacts = request.data.customers;
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
          this.filteredContacts = request.data.customers;
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
    getInterestedCustomers() {
      this.interestedCustomers = [];
      if (this.selectedCampaign && this.selectedCampaign.id > 0)
        this.axios
          .post(
            "http://localhost:18088/adminarea/messageCampaign/getCampaignInterestedCustomers",
            { messageCampaign: this.selectedCampaign }
          )
          .then((request) => {
            if (request.data.clicks) {
              request.data.clicks.forEach((click) => {
                var interestedCustomer = {
                  id: click.customer.id,
                  url: click.link.urlOriginal,
                  firstname: click.customer.firstname,
                  lastname: click.customer.lastname,
                  address: click.customer.address,
                  mobilephone: click.customer.mobilephone,
                  postcode: click.customer.postcode,
                };
                this.interestedCustomers.push(interestedCustomer);
              });
            }
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
      this.getInterestedCustomers();
    },
    loadCSVFile() {
      if (this.selectedCampaign.id > 0) {
        var formData = new FormData();
        formData.append("csv_data", this.fileCSV);
        formData.append("idCampaign", this.selectedCampaign.id);

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
      }
    },
    parseDate(date) {
      if (!date) return null;
      const [day, month, year] = date.split("/");
      return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    },
    formatDate(date) {
      if (!date) return null;
      const [year, month, day] = date.split("-");
      this.beginDate = `${day}/${month}/${year}`;
      return `${day}/${month}/${year}`;
    },
    saveTime(time) {
      this.beginTime=time;
    },
    getBeginDate() {
      const [day, month, year] = this.beginDate.split("/");
      return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")} ${this.beginTime}:00.000`;
    }
  },
  computed: {
    computedDateFormatted() {
      return this.formatDate(this.date);
    },
  },
  watch: {
    date(val) {
      this.dateFormatted = this.formatDate(this.date);
    },
  },
};
</script>

<style></style>
