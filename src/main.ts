// src/main.ts
import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import { createPinia } from 'pinia';
import PrimeVue from 'primevue/config';
import 'primevue/resources/themes/lara-dark-teal/theme.css'; 
import 'primevue/resources/primevue.min.css';
import 'primeicons/primeicons.css';
import ToastService from 'primevue/toastservice';
import Toast from 'primevue/toast';
import ConfirmationService from 'primevue/confirmationservice';
import ConfirmDialog from 'primevue/confirmdialog';
import './assets/global-overrides.css';
import { supabase } from './supabase';
// Importar y registrar Chart.js y el plugin de Datalabels
import { Chart, registerables } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
Chart.register(...registerables, ChartDataLabels); 



const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.use(router);
app.use(PrimeVue);
app.use(ToastService);
app.use(ConfirmationService);
app.component('Toast', Toast);
app.component('ConfirmDialog', ConfirmDialog);


app.provide('supabase', supabase); 
app.mount('#app');