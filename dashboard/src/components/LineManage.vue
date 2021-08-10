<template>
  <v-container v-if="gateway && gateway.objData">
    <v-btn @click="openPhoneDialDlg()"
      >{{ line+1 }} -- {{ gateway.objData.lines[line] }}</v-btn
    >
    <v-spacer></v-spacer>
    <v-switch
      v-model="isWorkingCall"
      flat
      :change="changeStateLineCall()"
      :label="lblStateCall"
    ></v-switch>
    <v-switch
      v-model="isWorkingSms"
      flat
      :change="changeStateLineSms()"
      :label="lblStateSms"
    ></v-switch>

    <v-dialog
      v-model="dialDlg"
      persistent
      max-width="600px"
      @keydown.esc="cancel"
    >
      <v-card>
        <v-card-title
          >Test per chiamate ed invio SMS - {{ this.linePhoneNumber }}</v-card-title
        >
        <v-card-text>
          <v-text-field
            v-model="phoneNumber"
            counter="14"
            hint="inserisci numero di destinazione"
            label="Numero di telefono"
          ></v-text-field>
        </v-card-text>
        <v-card-text>
          <v-text-field
            v-model="message"
            counter="14"
            hint="Messaggio di Test"
            label="Messaggio"
          ></v-text-field>
        </v-card-text>

        <v-card-text>
          <p style="color: black">Risultato: {{ resultOperation }}</p>
        </v-card-text>

        <v-card-actions class="pt-3">
          <v-spacer></v-spacer>

          <v-btn
            color="primary"
            class="body-2 font-weight-bold"
            outlined
            @click="dialCall()"
            >Chiama</v-btn
          >

          <v-btn
            color="primary"
            class="body-2 font-weight-bold"
            outlined
            @click="sendSms()"
            >Invia SMS</v-btn
          >

          <v-btn
            color="primary"
            class="body-2 font-weight-bold"
            outlined
            @click="dialDlg = false"
            >Chiudi</v-btn
          >
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script>
export default {
  name: "LineManage",
  props: {
    lineObject: {},
  },
  data: () => ({
    isWorkingCall: true,
    isWorkingSms: true,
    lblStateCall: "CH. Si",
    lblStateSms: "SMS Si",
    gateway: {},
    line: 0,
    linePhoneNumber: "",
    phoneNumber: "3939241987",
    message: "Test di prova http://w.wfn.ovh/324/asd/2",
    resultOperation: "",
    dialDlg: false,
  }),
  created() {
    this.gateway = this.lineObject.gateway;
    this.line = this.lineObject.line;
    this.isWorkingSms =
      this.gateway.objData.isWorkingSms[this.line] === 1 ||
      this.gateway.objData.isWorkingSms[this.line] === true;
    this.isWorkingCall =
      this.gateway.objData.isWorkingCall[this.line] === 1 ||
      this.gateway.objData.isWorkingCall[this.line] === true;
  },
  mounted() {},
  computed: {},
  methods: {
    changeStateLineSms() {
      if (this.isWorkingSms === true) {
        this.lblStateSms = "SMS SI";
        this.gateway.objData.isWorkingSms[this.line] = true;
      } else {
        this.lblStateSms = "SMS NO";
        this.gateway.objData.isWorkingSms[this.line] = false;
      }
      updateGateway();
    },
    changeStateLineCall() {
      if (this.isWorkingCall === true) {
        this.lblStateCall = "CHI SI";
        this.gateway.objData.isWorkingCall[this.line] = true;
      } else {
        this.lblStateCall = "CHI NO";
        this.gateway.objData.isWorkingCall[this.line] = false;
      }
      updateGateway();
    },
    updateGateway() {
      this.axios
        .post("/adminarea/gateway/update", {
          gateway: this.gateway,
        })
        .then((request) => {
          if (request.data.status === "OK") {
            alert("Dati aggiornati");
          } else {
            alert("Errore aggiornamento dati");
          }
        });
    },
    sendSms() {
      var lines = this.gateway.objData.lines;
      this.linePhoneNumber = lines[this.line];
      this.resultOperation = "";
      this.axios
        .post("/adminarea/gateway/sendSms", {
          gateway: this.gateway,
          line: this.line,          
          phonenumber: this.phoneNumber,
          message: this.message,
        })
        .then((request) => {
          if (
            request.data.status === "send" ||
            request.data.status === "sending"
          )
            this.resultOperation = "Inviato" + "( " + request.data.msg + " da "+this.linePhoneNumber+" )";
          else
            this.resultOperation =
              "Errore invio" + "(" + request.data.msg + ")";
        });
    },
    dialCall() {
      var lines = this.gateway.objData.lines;
      this.linePhoneNumber = lines[this.line];
      this.resultOperation = "";
      this.axios
        .post("/adminarea/gateway/dialCall", {
          gateway: this.gateway,
          line: this.line,
          phonenumber: this.phoneNumber,
        })
        .then((request) => {
          console.log(request);
          if (request.data.state === "dial")
            this.resultOperation =
              "In chiamata ... ( da linea " + (this.line + 1) + " -- "+this.linePhoneNumber+" )";
          else this.resultOperation = "Fallito";
        });
    },
    openPhoneDialDlg() {
      this.resultOperation = "";
      this.dialDlg = true;
    },
  },
};
</script>

<style lang="sass" scoped>
a
  color: inherit !important
</style>
