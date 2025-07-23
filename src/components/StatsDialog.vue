<template>
  <Dialog
    :visible="visible"
    @update:visible="$emit('update:visible', $event)"
    modal
    :header="dialogHeader"
    :style="{ width:'95vw', height: '95vh'}"
    :breakpoints="{ '1199px': '95vw', '575px': '98vw' }"
    :maximizable="true"
    :draggable="false"
    class="stats-dialog stats-full-screen-dialog"
  >
    <template #header>
      <div class="dialog-header-content">
        <span class="dialog-title">{{ dialogHeader }}</span>
        <div class="user-filter-buttons">
          <Button
            label="Todos"
            :severity="selectedUserId === 'all' ? 'primary' : 'secondary'"
            @click="selectedUserId = 'all'"
            rounded
            class="p-button-sm mr-2"
          />
          <Button
            v-for="profile in serviceStore.allUserProfiles"
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
        <!-- Contenido de la pestaña "Estado del Servicio" -->
        <div v-if="activeTabIndex === 0">
          <h3>Estado de Servicios</h3>
          <div class="grid mt-3">
            <div class="col-12 md:col-4">
              <div class="stat-card p-3 surface-card border-round shadow-1">
                <div class="text-xl font-bold">Activos</div>
                <div class="text-5xl text-green-500">{{ activeServicesCount }}</div>
              </div>
            </div>
            <div class="col-12 md:col-4">
              <div class="stat-card p-3 surface-card border-round shadow-1">
                <div class="text-xl font-bold">Vencidos</div>
                <div class="text-5xl text-red-500">{{ expiredServicesCount }}</div>
              </div>
            </div>
            <div class="col-12 md:col-4">
              <div class="stat-card p-3 surface-card border-round shadow-1">
                <div class="text-xl font-bold">Renovados</div>
                <div class="text-5xl text-blue-500">{{ renewedServicesCount }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Contenido de la pestaña "Financiero y Pagos" -->
        <div v-if="activeTabIndex === 1">
          <h3>Financiero y Pagos</h3>
          <div class="grid mt-3">
            <div class="col-12 md:col-6 lg:col-4">
              <div class="stat-card p-3 surface-card border-round shadow-1">
                <div class="text-xl font-bold">Monto Más Usado</div>
                <div class="text-4xl text-purple-500">${{ mostUsedAmount.toFixed(2) }}</div>
                <div class="text-sm text-color-secondary">({{ mostUsedAmountFrequency }} servicios)</div>
              </div>
            </div>
            <div class="col-12 md:col-6 lg:col-4">
              <div class="stat-card p-3 surface-card border-round shadow-1">
                <div class="text-xl font-bold">Monto Más Alto</div>
                <div class="text-4xl text-orange-500">${{ highestAmount.toFixed(2) }}</div>
              </div>
            </div>
            <div class="col-12 md:col-12 lg:col-4">
              <div class="stat-card p-3 surface-card border-round shadow-1">
                <div class="text-xl font-bold">Ingreso Promedio Mensual</div>
                <div class="text-4xl text-teal-500">${{ monthlyAverageIncome.toFixed(2) }}</div>
              </div>
            </div>
            <div class="col-12">
              <h4>Métodos de Pago Preferidos</h4>
              <Chart type="pie" :data="paymentMethodChartData" :options="chartOptions" class="w-full" />
            </div>
          </div>
        </div>

        <!-- Contenido de la pestaña "Otras Estadísticas" -->
        <div v-if="activeTabIndex === 2">
          <h3>Otras Estadísticas</h3>
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
import type { Service, UserProfile } from '@/types/Service';

//Importaciones de Charts
 import { Chart as ChartJS, registerables } from 'chart.js';
 import ChartDataLabels from 'chartjs-plugin-datalabels';
 ChartJS.register(...registerables, ChartDataLabels);
 
const props = defineProps<{
  visible: boolean;
}>();

// Emits para controlar la visibilidad del diálogo
const emits = defineEmits(['update:visible']);

const serviceStore = useServiceStore();

const dialogHeader = ref('Estadísticas de Servicios');
const selectedUserId = ref<string | 'all'>('all'); 
const activeTabIndex = ref(0); 

// Menú de pestañas para las categorías de estadísticas
const tabMenuItems = ref([
  { label: 'Estado del Servicio', icon: 'pi pi-chart-line' },
  { label: 'Financiero y Pagos', icon: 'pi pi-wallet' },
  { label: 'Otras Estadísticas', icon: 'pi pi-sitemap' }
]);

// Opciones de gráficos (comunes para todos)
const chartOptions = ref({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      labels: {
        color: 'var(--text-color-secondary)',
        font: {
          size: 14 
        }
      }
    },
    // Configuración para el plugin de Datalabels
    datalabels: {
      color: 'var(--text-color)',
      font: {
        weight: 'bold',
        size: 14 
      },
      formatter: (value: number) => {
        return value;
      }
    }
  },
  scales: {
    x: {
      ticks: {
        color: 'var(--blue-100',
        font: {
          size: 12 
        }
      },
      grid: {
        color: 'var(--surface-border)' 
      }
    },
    y: {
      ticks: {
        color: 'var(--blue-50)',
        font: {
          size: 12
        }
      },
      grid: {
        color: 'var(--blue-50)' 
      }
    }
  }
});


// --- Computed Properties para los datos filtrados y estadísticas ---

// Filtra los servicios según el usuario seleccionado
const filteredServices = computed(() => {
  if (selectedUserId.value === 'all') {
    return serviceStore.services;
  }
  return serviceStore.services.filter(s => s.owner_id === selectedUserId.value);
});

// --- Estadísticas de "Estado del Servicio" ---
const activeServicesCount = computed(() => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return filteredServices.value.filter(service => {
    const expirationDate = new Date(service.expiration_date);
    expirationDate.setHours(0, 0, 0, 0);
    return expirationDate.getTime() > today.getTime();
  }).length;
});

const expiredServicesCount = computed(() => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return filteredServices.value.filter(service => {
    const expirationDate = new Date(service.expiration_date);
    expirationDate.setHours(0, 0, 0, 0);
    return expirationDate.getTime() <= today.getTime();
  }).length;
});

const renewedServicesCount = computed(() => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return filteredServices.value.filter(service => {
    const createdAt = new Date(service.created_at);
    const updatedAt = new Date(service.updated_at);
    const expirationDate = new Date(service.expiration_date);
    expirationDate.setHours(0, 0, 0, 0);

    return updatedAt.getTime() > createdAt.getTime() && expirationDate.getTime() > today.getTime();
  }).length;
});

// --- Estadísticas de "Financiero y Pagos" ---

const paymentMethodChartData = computed(() => {
  const methodCounts: { [key: string]: number } = {};
  filteredServices.value.forEach(service => {
    methodCounts[service.payment_method] = (methodCounts[service.payment_method] || 0) + 1;
  });

  const labels = Object.keys(methodCounts);
  const data = Object.values(methodCounts);

  const backgroundColors = [
    '#42A5F5', '#66BB6A', '#FFA726', '#EF5350', '#AB47BC', '#26A69A', '#FF7043', '#78909C', '#5C6BC0'
  ];

  return {
    labels: labels,
    datasets: [
      {
        data: data,
        backgroundColor: backgroundColors.slice(0, labels.length),
        hoverBackgroundColor: backgroundColors.slice(0, labels.length)
      }
    ]
  };
});

const mostUsedAmount = computed(() => {
  const amountCounts: { [amount: string]: number } = {}; 
  filteredServices.value.forEach(service => {
    const amountStr = service.amount.toFixed(2); 
    amountCounts[amountStr] = (amountCounts[amountStr] || 0) + 1;
  });

  let maxCount = 0;
  let mostUsed = 0;
  let mostUsedAmountStr = '0.00';

  for (const amountStr in amountCounts) {
    if (amountCounts[amountStr] > maxCount) {
      maxCount = amountCounts[amountStr];
      mostUsedAmountStr = amountStr;
    }
  }
  return parseFloat(mostUsedAmountStr);
});

const mostUsedAmountFrequency = computed(() => {
  const amountCounts: { [amount: string]: number } = {};
  filteredServices.value.forEach(service => {
    const amountStr = service.amount.toFixed(2);
    amountCounts[amountStr] = (amountCounts[amountStr] || 0) + 1;
  });

  let maxCount = 0;
  for (const amountStr in amountCounts) {
    if (amountCounts[amountStr] > maxCount) {
      maxCount = amountCounts[amountStr];
    }
  }
  return maxCount;
});


const highestAmount = computed(() => {
  if (filteredServices.value.length === 0) return 0;
  return Math.max(...filteredServices.value.map(s => s.amount));
});

const monthlyAverageIncome = computed(() => {
  if (filteredServices.value.length === 0) return 0;

  const monthlyTotals: { [yearMonth: string]: number } = {};
  filteredServices.value.forEach(service => {
    const date = new Date(service.purchase_date);
    const yearMonth = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
    monthlyTotals[yearMonth] = (monthlyTotals[yearMonth] || 0) + service.amount;
  });

  const totalMonths = Object.keys(monthlyTotals).length;
  if (totalMonths === 0) return 0;

  const totalIncome = Object.values(monthlyTotals).reduce((sum, amount) => sum + amount, 0);
  return totalIncome / totalMonths;
});

// --- Estadísticas de "Otras Estadísticas" ---

const servicesByServerChartData = computed(() => {
  const serverCounts: { [server: string]: number } = {};
  filteredServices.value.forEach(service => {
    serverCounts[service.server] = (serverCounts[service.server] || 0) + 1;
  });

  const labels = Object.keys(serverCounts);
  const data = Object.values(serverCounts);

  return {
    labels: labels,
    datasets: [
      {
        label: 'Número de Servicios',
        backgroundColor: '#42A5F5', 
        data: data
      }
    ]
  };
});

const deviceUsageChartData = computed(() => {
  const deviceCounts: { [device: string]: number } = {};
  filteredServices.value.forEach(service => {
    service.device.forEach(deviceEntry => {
      const match = deviceEntry.match(/^(.*?)\s*\((\d+)\)$/);
      if (match) {
        const deviceName = match[1];
        const count = parseInt(match[2], 10);
        deviceCounts[deviceName] = (deviceCounts[deviceName] || 0) + count;
      } else {
        deviceCounts[deviceEntry] = (deviceCounts[deviceEntry] || 0) + 1;
      }
    });
  });

  const labels = Object.keys(deviceCounts);
  const data = Object.values(deviceCounts);

  const backgroundColors = [
    '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40', '#E7E9EE', '#C9CBCE'
  ];

  return {
    labels: labels,
    datasets: [
      {
        data: data,
        backgroundColor: backgroundColors.slice(0, labels.length),
        hoverBackgroundColor: backgroundColors.slice(0, labels.length)
      }
    ]
  };
});

// --- Watchers y Lifecycle ---
watch(() => props.visible, (newVal) => {
  if (newVal) {
    serviceStore.fetchServices();
    selectedUserId.value = 'all';
    activeTabIndex.value = 0; 
  }
});

onMounted(() => {
  if (serviceStore.allUserProfiles.length === 0 && serviceStore.userRole === 'admin') {
    serviceStore.fetchUser();
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

.stats-content h3 {
  margin-top: 1rem;
  margin-bottom: 1.5rem;
  font-size: 1.5rem;
  color: var(--text-color);
  text-align: center;
}

.stat-card {
  text-align: center;
  border: 1px solid var(--surface-border);
  transition: all 0.2s ease-in-out;
}

.stat-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 6px 12px rgba(0,0,0,0.1);
}

.stat-card div {
  margin-bottom: 0.5rem;
}

.tab-content-panel {
  flex-grow: 1;
  overflow-y: auto;
  padding: 1rem;
}

/* Estilos para los gráficos */
.w-full {
  width: 100%;
}
.stats-full-screen-dialog :deep(.p-dialog) {
  width: 95vw !important; 
  height: 95vh !important; 
  max-width: 95vw !important; 
  max-height: 95vh !important; 
}
.tab-content-panel .col-12 > h4 + .p-chart { 
  min-height: 300px; 
  max-height: 400px; 
  width: 100%; 
}

/* Ajustes específicos para los contenedores de los gráficos de pie/doughnut */
.tab-content-panel .col-12 > .p-chart { 
  min-height: 300px; 
  max-height: 400px; 
  width: 100%;
}

/* Si los gráficos están directamente dentro de una columna sin h4 */
.tab-content-panel .col-12 .p-chart {
  min-height: 300px;
  max-height: 400px;
}
</style>