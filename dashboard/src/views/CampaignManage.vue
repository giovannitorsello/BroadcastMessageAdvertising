<template>
  <div>
    <v-container>
      <p>
        Campagna selezionata. {{ selectedCampaign.name }} --
        {{ ncontacts }}
      </p>
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

            <v-col>
              <v-select
                v-model="selectedSenderService.id"
                :items="senderServices"
                label="Metodo invio"
                item-text="name"
                item-value="id"
              >
              </v-select>
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
              <v-btn color="primary" v-on:click="getCampaigns"
                >Aggiorna la tabella</v-btn
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
                  <tr
                    @click="selectCampaign(row.item)"
                    :class="{ primary: row.item.id === selectedCampaign.id }"
                  >
                    <td>{{ row.item.id }}</td>
                    <td>{{ row.item.name }}</td>
                    <td>{{ row.item.senderService }}</td>
                    <td>{{ row.item.state }}</td>
                    <td>{{ row.item.message }}</td>
                    <td>{{ row.item.ncontacts }}</td>
                    <td>{{ row.item.nCalledContacts }}</td>
                    <td>{{ row.item.ncompleted }}</td>
                    <td>{{ row.item.begin }}</td>
                    <td>{{ row.item.end }}</td>
                    <td>
                      <v-btn
                        class="mx-4"
                        fab
                        dark
                        x-small
                        color="pink"
                        @click="startCallContacts(row.item)"
                      >
                        <v-icon dark>mdi-phone</v-icon>
                      </v-btn>
                    </td>
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
                        :disabled="row.item.state !== 'disabled'"
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
                label="Messaggio prima pagina web"
                v-model="messagePage1"
              ></v-text-field>
              <v-text-field
                name="input-7-1"
                filled
                label="Messaggio seconda pagina web"
                v-model="messagePage2"
              ></v-text-field>
            </v-col>
          </v-row>
          <v-row>
            <v-col>
              <v-file-input
                v-on:change="loadImageFile"
                v-model="fileImage"
                truncate-length="15"
                show-size
                label="Carica il file di immagine"
              ></v-file-input>
            </v-col>
          </v-row>
          <v-row>
            <v-col>
              <a :href="urlImageFile">Link di test</a>
            </v-col>
            <v-col>
              <v-img height="200" width="200" :src="urlImageFile"></v-img>
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
                <v-btn color="primary" v-on:click="getContacts"
                  >Aggiorna la tabella</v-btn
                >
                <v-data-table
                  :headers="headersCustomers"
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
                :headers="headersCustomers"
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
          <v-btn color="primary" v-on:click="getInterestedContacts"
            >Aggiorna la tabella</v-btn
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

        <v-tab href="#noclickcustomers">
          <v-card flat>
            <v-card-text>Clienti non interessati</v-card-text>
          </v-card>
        </v-tab>
        <v-tab-item
          v-if="selectedCampaign.id"
          id="noclickcustomers"
          key="noclickcustomers"
        >
          <v-btn color="primary" v-on:click="getNoInterestedContacts"
            >Aggiorna la tabella</v-btn
          >
          <v-row>
            <v-col>
              <v-data-table
                :headers="headersCustomers"
                :items="noInterestedCustomers"
                :items-per-page="30"
                class="elevation-1"
              >
              </v-data-table>
            </v-col>
          </v-row>
        </v-tab-item>
      </v-tabs>
    </v-container>

    <!--Dialog for upload file-->
    <v-row>
      <v-col cols="auto">
        <v-dialog
          v-model="dialogImportContacts"
          transition="dialog-top-transition"
          max-width="600"
        >
          <v-card>
            <v-toolbar color="primary" dark>Operazione in corso</v-toolbar>
            <v-card-text>
              <div class="text-h5 pa-12">
                Attendere la fine dell'operazione
                <v-progress-linear
                  indeterminate
                  color="green"
                  class="mb-0"
                ></v-progress-linear>
              </div>
            </v-card-text>
          </v-card>
        </v-dialog>
      </v-col>
    </v-row>
  </div>
</template>

<script>
export default {
  data() {
    return {
      campaignName: "",
      senderServices: [],
      messagePage1: "Vuoi ricevere maggiori informazioni senza impegno?",
      messagePage2:
        "Grazie, sarai ricontattato da un nostro operatore al più presto",
      messageText: "Testo di prova",
      urlImageFile: "",
      beginDate: "",
      beginTime: "",
      date: new Date().toISOString().substr(0, 10),
      time: "",
      menuDate: false,
      menuTime: false,
      selectedSenderService: {},
      selectedCap: "",
      selectedCity: "",
      selectedState: "",
      selectedProvince: "",
      selectedCountry: "",
      selectedCampaign: { name: "", contacts: [], message: {} },
      ncontacts: 0,
      messageCampaigns: [],
      contacts: [],
      filteredContacts: [],
      interestedCustomers: [],
      noInterestedCustomers: [],
      calledCustomers: [],
      caps: [],
      cities: [],
      provinces: [],
      states: [],
      countries: [],

      tab: null,
      fileCSV: [],
      fileImage: [],
      bSaveCampaignButtonDisable: true,
      dialogImportContacts: false,
      headersCustomers: [
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
        { text: "Conferma", value: "confirmed" },
        { text: "Nome", value: "firstname" },
        { text: "Cognome", value: "lastname" },
        { text: "Telefono", value: "mobilephone" },
        { text: "Indirizzo", value: "address" },
        { text: "CAP", value: "postcode" },
      ],
      headerCampaigns: [
        { text: "Codice", value: "id" },
        { text: "Nome campagna", value: "name" },
        { text: "Metodo invio", value: "senderService" },
        { text: "Stato", value: "state" },
        { text: "Messagio", value: "message" },
        { text: "Numero contatti", value: "ncontacts" },
        { text: "Contatti verificati", value: "nCalledContacts" },
        { text: "Completamento", value: "ncompleted" },
        { text: "Inizio", value: "begin" },
        { text: "Fine", value: "end" },
      ],
    };
  },
  mounted() {
    this.beginDate = new Date().toLocaleDateString("it-IT");
    this.beginTime = new Date().toLocaleTimeString("it-IT");
    this.getSenderServices();
    this.getCaps();
    this.getCities();
    this.getProvinces();
    this.getStates();
    this.getCountries();
    this.refreshAll();
  },
  methods: {
    startCallContacts(messageCampaign) {
      this.axios
        .post("/adminarea/messageCampaign/startCallContacts", {
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
    startCampaign(messageCampaign) {
      this.axios
        .post("/adminarea/messageCampaign/start", {
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
        .post("/adminarea/messageCampaign/pause", {
          messageCampaign: messageCampaign,
        })
        .then((request) => {
          this.selectedCampaign = request.data.messageCampaign;
          var fileArchive = request.data.fileArchive;
          this.downloadMessageCampaignArchive(fileArchive);
          this.getMessageCampaigns();
        })
        .catch((error) => {
          console.log(error);
        });
    },
    deleteCampaign(messageCampaign) {
      this.axios
        .post("/adminarea/messageCampaign/delete", {
          messageCampaign: messageCampaign,
        })
        .then((request) => {
          var fileArchive = request.data.fileArchive;
          this.downloadMessageCampaignArchive(fileArchive);
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
          .post("/adminarea/messageCampaign/getCampaign", {
            messageCampaign: campaign,
          })
          .then((request) => {
            if (request.data.messageCampaign) {
              this.selectedCampaign = request.data.messageCampaign;
              this.ncontacts = this.selectedCampaign.ncontacts;

              if (this.selectedCampaign.message)
                this.messageText = this.selectedCampaign.message;
              if (this.selectedCampaign.messagePage1)
                this.messagePage1 = this.selectedCampaign.messagePage1;
              if (this.selectedCampaign.messagePage2)
                this.messagePage2 = this.selectedCampaign.messagePage2;
              if (this.selectedCampaign.imageFile)
                this.urlImageFile = this.selectedCampaign.imageFile;
            }
          })
          .catch((error) => {
            console.log(error);
          });
      }
    },
    cleanContacts(campaign) {
      this.axios
        .post("/adminarea/messageCampaign/cleanContacts", {
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
    insertMessageCampaign() {
      console.log("Message service");
      console.log(this.selectedSenderService.id);
      this.contacts = [];
      this.axios
        .post("/adminarea/messageCampaign/insert", {
          messageCampaign: {
            name: this.campaignName,
            ncontacts: this.contacts.length,
            message: this.messageText.replace(/\n/g, " "), //useful to remove carriage return
            messagePage1: this.messagePage1,
            messagePage2: this.messagePage2,
            senderService: this.selectedSenderService.id,
            begin: this.getBeginDate(),
          },
        })
        .then((request) => {
          this.selectedCampaign = request.data.messageCampaign;
          this.messageCampaigns.push(request.data.messageCampaign);
          this.contacts = this.messageCampaigns.contacts;
          this.fileCSV = [];
          console.log("Campaign insert");
          console.log(this.selectedCampaign);
        })
        .catch((error) => {
          console.log(error);
        });
    },
    updateMessageCampaign() {
      console.log("Message service");
      console.log(this.selectedSenderService.id);
      this.axios
        .post("/adminarea/messageCampaign/update", {
          messageCampaign: {
            id: this.selectedCampaign.id,
            name: this.selectedCampaign.name,
            state: this.selectedCampaign.state,
            contacts: this.contacts,
            ncontacts: this.selectedCampaign.ncontacts,
            message: this.messageText.replace(/\n/g, " "),
            messagePage1: this.messagePage1,
            messagePage2: this.messagePage2,
            senderService: this.selectedSenderService.id
          },
        })
        .then((request) => {
          this.selectedCampaign = request.data.messageCampaign;
          this.ncontacts = this.selectedCampaign.ncontacts;
        })
        .catch((error) => {
          console.log(error);
        });
    },
    filterContactsCampaign() {
      this.contacts = this.filteredContacts;
      this.updateMessageCampaign();
    },
    getCampaigns() {
      this.refreshAll();
    },
    getMessageCampaigns() {
      this.messageCampaigns = [];
      this.axios
        .post("/adminarea/messageCampaign/getAll")
        .then((request) => {
          if (request.data.messageCampaigns) {
            request.data.messageCampaigns.forEach((camp) => {
              camp.begin = new Date(camp.begin).toLocaleString("it-IT");
              camp.end = new Date(camp.end).toLocaleString("it-IT");
              this.getCalledContacts(camp, (campaign) => {
                this.messageCampaigns.push(campaign);
              });
            });
          }
        })
        .catch((error) => {
          console.log(error);
        });
    },
    getCaps() {
      this.axios
        .post("/adminarea/customer/getCaps")
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
        .post("/adminarea/customer/getCities")
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
        .post("/adminarea/customer/getProvinces")
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
        .post("/adminarea/customer/getStates")
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
        .post("/adminarea/customer/getCountries")
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
        .post("/adminarea/customer/selectByCap", {
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
        .post("/adminarea/customer/selectByCity", {
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
        .post("/adminarea/customer/selectByProvince", {
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
        .post("/adminarea/customer/selectByState", {
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
        .post("/adminarea/customer/selectByCountries", {
          selectedCountry: this.selectedCountry,
        })
        .then((request) => {
          this.filteredContacts = request.data.customers;
        })
        .catch((error) => {
          console.log(error);
        });
    },
    getSenderServices() {
      this.axios
        .post("/adminarea/customer/getSenderServices", {          
        })
        .then((request) => {
          this.senderServices = request.data.senderServices;
        })
        .catch((error) => {
          console.log(error);
        });
    },
    getContacts() {
      this.axios
        .post("/adminarea/messageCampaign/getCampaignCustomers", {
          messageCampaign: this.selectedCampaign,
        })
        .then((request) => {
          this.contacts = request.data.customers;
        })
        .catch((error) => {
          console.log(error);
        });
    },
    getInterestedContacts() {
      console.log("Get interested");
      this.interestedCustomers = [];
      if (this.selectedCampaign && this.selectedCampaign.id > 0)
        this.axios
          .post("/adminarea/messageCampaign/getCampaignInterestedCustomers", {
            messageCampaign: this.selectedCampaign,
          })
          .then((request) => {
            if (request.data.customers) {
              request.data.customers.forEach((customer) => {
                var strConfirm = "";
                if (customer.confirm) strConfirm = "2 click";
                if (!customer.confirm) strConfirm = "1 click";

                var interestedCustomer = {
                  id: customer.id,
                  confirmed: strConfirm,
                  firstname: customer.firstname,
                  lastname: customer.lastname,
                  address: customer.address,
                  mobilephone: customer.mobilephone,
                  postcode: customer.postcode,
                };
                this.interestedCustomers.push(interestedCustomer);
              });
            }
          })
          .catch((error) => {
            console.log(error);
          });
    },
    getNoInterestedContacts() {
      this.interestedCustomers = [];
      if (this.selectedCampaign && this.selectedCampaign.id > 0)
        this.axios
          .post("/adminarea/messageCampaign/getCampaignNoInterestedCustomers", {
            messageCampaign: this.selectedCampaign,
          })
          .then((request) => {
            if (request.data.customers) {
              this.noInterestedCustomers = request.data.customers;
            }
          })
          .catch((error) => {
            console.log(error);
          });
    },
    getCalledContacts(messageCampaign, callback) {
      this.interestedCustomers = [];
      if (messageCampaign && messageCampaign.id > 0)
        this.axios
          .post("/adminarea/messageCampaign/getCampaignCalledCustomers", {
            messageCampaign: messageCampaign,
          })
          .then((request) => {
            if (request.data.customers) {
              messageCampaign.calledCustomers = request.data.customers;
              messageCampaign.nCalledContacts = request.data.customers.length;
              messageCampaign.nNotCalledContacts =
                messageCampaign.ncontacts - messageCampaign.nCalledContacts;
              callback(messageCampaign);
            }
          })
          .catch((error) => {
            console.log(error);
          });
    },
    refreshAll() {
      this.getMessageCampaigns();
    },
    loadCSVFile() {
      if (this.selectedCampaign.id > 0) {
        this.dialogImportContacts = true;
        this.bSaveCampaignButtonDisable = true;
        var formData = new FormData();
        formData.append("csv_data", this.fileCSV);
        formData.append("idCampaign", this.selectedCampaign.id);
        this.axios
          .post("/upload/contacts", formData, {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          })
          .then((request) => {
            this.dialogImportContacts = false;
            this.contacts = [];
            this.ncontacts = request.data.ncontacts;
            this.selectedCampaign.ncontacts = request.data.ncontacts;
            this.updateMessageCampaign();
          })
          .catch((error) => {
            console.log(error);
          });
      }
    },
    loadImageFile() {
      if (this.selectedCampaign.id > 0) {
        this.dialogImportContacts = true;
        this.bSaveCampaignButtonDisable = true;
        var formData = new FormData();
        formData.append("image_data", this.fileImage);
        formData.append("idCampaign", this.selectedCampaign.id);
        console.log("Uploading image ...");
        this.axios
          .post("/upload/image", formData, {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          })
          .then((request) => {
            this.dialogImportContacts = false;
            this.urlImageFile =
              request.data.urlImageCampaign + "?" + new Date().getTime();
            console.log(this.urlImageFile);
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
      this.beginTime = time;
    },
    getBeginDate() {
      const [day, month, year] = this.beginDate.split("/");
      return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")} ${
        this.beginTime
      }:00.000`;
    },
    downloadMessageCampaignArchive(fileArchive) {
      var zipCampaignArchive = fileArchive.fileArchive;
      this.axios({
        url: "/downloads/" + zipCampaignArchive,
        method: "GET",
        responseType: "blob",
      }).then((response) => {
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", zipCampaignArchive);
        document.body.appendChild(link);
        link.click();
      });
    },
  },
  computed: {
    computedDateFormatted() {
      return this.formatDate(this.date);
    },
    disableSaveCampaignButton() {
      if (fileCSV.length === 0) return false;

      return this.bSaveCampaignButtonDisable;
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
