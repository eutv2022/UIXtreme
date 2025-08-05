<template>
  <Dialog
    :visible="visible"
    @update:visible="$emit('update:visible', $event)"
    modal
    header="Estadísticas del Negocio"
    :style="{ width:'95vw'}"
    :breakpoints="{ '1199px': '95vw', '575px': '98vw' }"
    :maximizable="true"
    :draggable="false"
    class="stats-dialog"
  >
    <template #header>
      <div class="dialog-header-content">
        <span class="dialog-title">Estadísticas de Servicios</span>
        <div class="user-filter-buttons">
          <Button
            label="Todos los Usuarios"
            :severity="selectedUserId === 'all' ? 'primary' : 'secondary'"
            @click="selectedUserId = 'all'"
            rounded
            class="p-button-sm mr-2"
          />
          <Button
            v-for="profile in serviceStore.allUserProfiles || []"
            :key="profile.id"
            :label="profile.username || 'Desconocido'"
            :severity="selectedUserId === profile.id ? 'primary' : 'secondary'"
            @click="selectedUserId = profile.id"
            rounded
            class="p-button-sm mr-2"
          />
        </div>
      </div>
    </template>

    <div class="stats-content">
      <TabMenu :model="tabMenuItems" v-model:activeIndex="activeTabIndex" />

      <div class="tab-content-panel p-4">
        <!-- Pestaña 1: Resumen General -->
        <div v-if="activeTabIndex === 0">
          <div class="grid mt-3">
            <div class="col-12 md:col-6 lg:col-3">
              <div class="stat-card">
                <i class="pi pi-check-circle text-green-500 text-3xl"></i>
                <div class="text-xl font-bold">Servicios Activos</div>
                <div class="text-5xl text-green-500">{{ activeServicesCount }}</div>
              </div>
            </div>
            <div class="col-12 md:col-6 lg:col-3">
              <div class="stat-card">
                <i class="pi pi-times-circle text-red-500 text-3xl"></i>
                <div class="text-xl font-bold">Servicios Vencidos</div>
                <div class="text-5xl text-red-500">{{ expiredServicesCount }}</div>
              </div>
            </div>
            <div class="col-12 md:col-6 lg:col-3">
              <div class="stat-card">
                <i class="pi pi-sync text-blue-500 text-3xl"></i>
                <div class="text-xl font-bold">Total de Renovaciones</div>
                <div class="text-5xl text-blue-500">{{ totalRenewalsCount }}</div>
              </div>
            </div>
            <div class="col-12 md:col-6 lg:col-3" v-if="selectedUserId === 'all'">
              <div class="stat-card">
                <i class="pi pi-users text-purple-500 text-3xl"></i>
                <div class="text-xl font-bold">Vendedores</div>
                <div class="text-5xl text-purple-500">{{ uniqueClientsCount }}</div>
              </div>
            </div>
          </div>
          <div class="mt-5 chart-container">
            <h4>Estado de Servicios</h4>
            <Chart type="bar" :data="servicesStatusChartData" :options="chartOptions" />
          </div>
        </div>

        <!-- Pestaña 2: Ingresos y Pagos -->
        <div v-if="activeTabIndex === 1">
          <div class="grid mt-3">
            <div class="col-12 md:col-6 lg:col-4">
              <div class="stat-card">
                <i class="pi pi-dollar text-green-500 text-3xl"></i>
                <div class="text-xl font-bold">Ingresos Totales</div>
                <div class="text-4xl text-green-500">${{ totalIncome.toFixed(2) }}</div>
              </div>
            </div>
            <div class="col-12 md:col-6 lg:col-4">
              <div class="stat-card">
                <i class="pi pi-arrow-circle-up text-orange-500 text-3xl"></i>
                <div class="text-xl font-bold">Ingresos por Renovaciones</div>
                <div class="text-4xl text-orange-500">${{ totalRenewalIncome.toFixed(2) }}</div>
              </div>
            </div>
            <div class="col-12 md:col-12 lg:col-4">
              <div class="stat-card">
                <i class="pi pi-chart-bar text-teal-500 text-3xl"></i>
                <div class="text-xl font-bold">Ingreso Promedio</div>
                <div class="text-4xl text-teal-500">${{ averageServiceIncome.toFixed(2) }}</div>
              </div>
            </div>
          </div>
          <div class="grid mt-5">
            <div class="col-12 md:col-6">
              <h4>Distribución de Pagos</h4>
              <Chart type="pie" :data="paymentMethodChartData" :options="chartOptions" class="w-full" />
            </div>
            <div class="col-12 md:col-6">
              <h4>Ingresos Mensuales</h4>
              <Chart type="bar" :data="monthlyIncomeChartData" :options="chartOptions" class="w-full" />
            </div>
          </div>
        </div>

        <!-- Pestaña 3: Detalles del Servicio -->
        <div v-if="activeTabIndex === 2">
          <div class="grid mt-3">
            <div class="col-12 md:col-6">
              <h4>Servicios por Servidor</h4>
              <Chart type="bar" :data="servicesByServerChartData" :options="chartOptions" class="w-full" />
            </div>
            <div class="col-12 md:col-6">
              <h4>Distribución de Dispositivos</h4>
              <Chart type="doughnut" :data="deviceUsageChartData" :options="chartOptions" class="w-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import TabMenu from 'primevue/tabmenu';
import Chart from 'primevue/chart';
import { useServiceStore } from '@/stores/services';
import type { Service, UserProfile, RenewalLog } from '@/types/Service';

// Importaciones para gráficos de PrimeVue
import { Chart as ChartJS, registerables } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
ChartJS.register(...registerables, ChartDataLabels);

const props = defineProps<{
  visible: boolean;
}>();

const emits = defineEmits(['update:visible']);
const serviceStore = useServiceStore();

const selectedUserId = ref<string | 'all'>('all');
const activeTabIndex = ref(0);

// Menú de pestañas para las categorías de estadísticas
const tabMenuItems = ref([
  { label: 'Resumen General', icon: 'pi pi-chart-pie' },
  { label: 'Ingresos y Pagos', icon: 'pi pi-wallet' },
  { label: 'Detalles del Servicio', icon: 'pi pi-server' },
]);

// Opciones de gráficos comunes para todos los charts
const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      labels: {
        color: 'var(--text-color)', // Usar el color de texto principal
        font: { size: 14 }
      }
    },
    datalabels: {
      color: 'var(--text-color)',
      font: { weight: 'bold', size: 14 },
      formatter: (value: number) => value > 0 ? value : ''
    }
  },
  scales: {
    x: {
      ticks: {
        color: '#D4D4D4' // Color claro para los números del eje X
      },
      grid: {
        color: 'rgba(255, 255, 255, 0.3)', // Aumento de opacidad
        lineWidth: 1 // Líneas más gruesas
      }
    },
    y: {
      ticks: {
        color: '#D4D4D4' // Color claro para los números del eje Y
      },
      grid: {
        color: 'rgba(255, 255, 255, 0.3)', // Aumento de opacidad
        lineWidth: 1 // Líneas más gruesas
      }
    }
  }
}));


// --- Computed Properties para los datos filtrados y estadísticas ---

// Filtra los servicios según el usuario seleccionado
const filteredServices = computed(() => {
  if (selectedUserId.value === 'all') {
    return serviceStore.services || [];
  }
  return (serviceStore.services || []).filter(s => s.owner_id === selectedUserId.value);
});

// Filtra los logs de renovación según el usuario seleccionado
const filteredRenewalLogs = computed(() => {
  if (selectedUserId.value === 'all') {
    return serviceStore.renewalLogs || [];
  }
  return (serviceStore.renewalLogs || []).filter(log => {
    const service = (serviceStore.services || []).find(s => s.id === log.service_id);
    return service && service.owner_id === selectedUserId.value;
  });
});

// --- Pestaña 1: Resumen General ---
const activeServicesCount = computed(() => {
  const today = new Date();
  return (filteredServices.value || []).filter(s => new Date(s.expiration_date) > today).length;
});

const expiredServicesCount = computed(() => {
  const today = new Date();
  return (filteredServices.value || []).filter(s => new Date(s.expiration_date) <= today).length;
});

const totalRenewalsCount = computed(() => {
  return (filteredRenewalLogs.value || []).length;
});

const uniqueClientsCount = computed(() => {
  // Ahora solo se calcula si la vista es para todos los usuarios
  if (selectedUserId.value !== 'all') {
    return 1;
  }
  const clients = new Set((serviceStore.services || []).map(s => s.owner_id));
  return clients.size;
});

const servicesStatusChartData = computed(() => {
  return {
    labels: ['Activos', 'Vencidos'],
    datasets: [
      {
        label: 'Servicios',
        backgroundColor: ['#4CAF50', '#F44336'], // Green and Red
        data: [activeServicesCount.value, expiredServicesCount.value]
      }
    ]
  };
});


// --- Pestaña 2: Ingresos y Pagos ---
const totalIncome = computed(() => {
  const serviceIncome = (filteredServices.value || []).reduce((sum, s) => sum + s.amount, 0);
  const renewalIncome = (filteredRenewalLogs.value || []).reduce((sum, r) => sum + r.amount, 0);
  return serviceIncome + renewalIncome;
});

const totalRenewalIncome = computed(() => {
  return (filteredRenewalLogs.value || []).reduce((sum, r) => sum + r.amount, 0);
});

const averageServiceIncome = computed(() => {
  if ((filteredServices.value || []).length === 0) return 0;
  return totalIncome.value / (filteredServices.value || []).length;
});

const paymentMethodChartData = computed(() => {
  const methodCounts: { [key: string]: number } = {};
  (filteredServices.value || []).forEach(s => {
    methodCounts[s.payment_method] = (methodCounts[s.payment_method] || 0) + 1;
  });

  const labels = Object.keys(methodCounts);
  const data = Object.values(methodCounts);

  const backgroundColors = [
    '#42A5F5', '#66BB6A', '#FFA726', '#EF5350', '#AB47BC'
  ];

  return {
    labels: labels,
    datasets: [{
      data: data,
      backgroundColor: backgroundColors.slice(0, labels.length)
    }]
  };
});

const monthlyIncomeChartData = computed(() => {
  const monthlyTotals: { [yearMonth: string]: number } = {};
  
  // Incluir ingresos de servicios iniciales
  (filteredServices.value || []).forEach(service => {
    const date = new Date(service.purchase_date);
    const yearMonth = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
    monthlyTotals[yearMonth] = (monthlyTotals[yearMonth] || 0) + service.amount;
  });

  // Incluir ingresos de renovaciones
  (filteredRenewalLogs.value || []).forEach(renewal => {
    const date = new Date(renewal.created_at);
    const yearMonth = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
    monthlyTotals[yearMonth] = (monthlyTotals[yearMonth] || 0) + renewal.amount;
  });

  const sortedMonths = Object.keys(monthlyTotals).sort();
  const data = sortedMonths.map(month => monthlyTotals[month]);

  return {
    labels: sortedMonths,
    datasets: [{
      label: 'Ingresos',
      backgroundColor: '#00D1B2',
      data: data,
    }]
  };
});

// --- Pestaña 3: Detalles del Servicio ---
const servicesByServerChartData = computed(() => {
  const serverCounts: { [server: string]: number } = {};
  (filteredServices.value || []).forEach(s => {
    serverCounts[s.server] = (serverCounts[s.server] || 0) + 1;
  });

  const labels = Object.keys(serverCounts);
  const data = Object.values(serverCounts);

  return {
    labels: labels,
    datasets: [{
      label: 'Número de Servicios',
      backgroundColor: '#42A5F5',
      data: data
    }]
  };
});

const deviceUsageChartData = computed(() => {
  const deviceCounts: { [device: string]: number } = {};
  (filteredServices.value || []).forEach(s => {
    s.device.forEach(deviceEntry => {
      const match = deviceEntry.match(/^(.*?)\s*\((\d+)\)$/);
      const deviceName = match ? match[1] : deviceEntry;
      const count = match ? parseInt(match[2], 10) : 1;
      deviceCounts[deviceName] = (deviceCounts[deviceName] || 0) + count;
    });
  });

  const labels = Object.keys(deviceCounts);
  const data = Object.values(deviceCounts);

  const backgroundColors = [
    '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF'
  ];

  return {
    labels: labels,
    datasets: [{
      data: data,
      backgroundColor: backgroundColors.slice(0, labels.length)
    }]
  };
});

// --- Watchers y Lifecycle ---
watch(() => props.visible, (newVal) => {
  if (newVal) {
    if (serviceStore.fetchServices) serviceStore.fetchServices();
    selectedUserId.value = 'all';
    activeTabIndex.value = 0;
  }
});
</script>

<style scoped>
.stats-dialog :deep(.p-dialog-header) {
  padding-bottom: 0;
  border-bottom: none;
}

.stats-dialog :deep(.p-dialog-content) {
  padding-top: 0;
  flex-grow: 1;
  display: flex;
  flex-direction: column;
}

.dialog-header-content {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding: 1rem 1.5rem 0.5rem 1.5rem;
}

.dialog-title {
  font-size: 1.8rem;
  font-weight: bold;
  margin-bottom: 1rem;
  color: var(--text-color);
}

.user-filter-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.user-filter-buttons .p-button {
  min-width: unset;
  padding: 0.5rem 0.75rem;
}

.stats-content {
  display: flex;
  flex-direction: column;
  height: auto;
  flex-grow: 1;
}

.stat-card {
  text-align: center;
  border: 1px solid var(--surface-border);
  border-radius: 8px;
  padding: 1.5rem;
  background-color: var(--surface-card);
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
  transition: all 0.2s ease-in-out;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.stat-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 6px 12px rgba(0,0,0,0.1);
}

.stat-card i {
  margin-bottom: 1rem;
}

.tab-content-panel {
  flex-grow: 1;
  overflow-y: auto;
  padding: 1rem;
}

h4 {
  text-align: center;
  margin-bottom: 1rem;
  font-size: 1.25rem;
  color: var(--text-color);
}

.chart-container {
  height: 400px;
}

/* Responsive adjustments */
@media (max-width: 960px) {
  .dialog-header-content {
    align-items: center;
    padding: 1rem;
  }
  .dialog-title {
    text-align: center;
  }
}
</style>
