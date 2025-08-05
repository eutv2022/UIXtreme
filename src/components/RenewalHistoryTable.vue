<template>
  <div class="renewal-history-table">
    <h4>Historial de Renovaciones</h4>
    <div v-if="isLoading" class="flex justify-content-center my-4">
      <ProgressSpinner style="width: 50px; height: 50px" strokeWidth="8" fill="var(--surface-ground)" animationDuration=".5s" aria-label="Cargando historial de renovaciones" />
    </div>
    <div v-else-if="renewalLogs.length === 0" class="text-center my-4">
      <p>No hay registros de renovación para este servicio.</p>
    </div>
    <DataTable
      v-else
      :value="renewalLogs"
      :stripedRows="true"
      :rows="5"
      :paginator="true"
      responsiveLayout="scroll"
    >
      <Column field="renewal_date" header="Fecha" :sortable="true">
        <template #body="{ data }">
          {{ formatDate(data.renewal_date) }}
        </template>
      </Column>
      <Column field="renewal_number" header="# R" :sortable="true"></Column>
      <Column field="amount" header="Monto" :sortable="true"></Column>
      <Column field="payment_method" header="Pago Por" :sortable="true"></Column>
      </DataTable>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { useServiceStore } from '@/stores/services';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import ProgressSpinner from 'primevue/progressspinner';
import type { RenewalLog } from '@/types/Service';

const props = defineProps<{
  serviceId: number;
}>();

const serviceStore = useServiceStore();
const renewalLogs = ref<RenewalLog[]>([]);
const isLoading = ref(false);

// Función para formatear la fecha
const formatDate = (date: string | Date) => {
  if (!date) return '';
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleDateString();
};

const fetchRenewalLogs = async (id: number) => {
  isLoading.value = true;
  // Llamamos a la nueva función que crearemos en el store.
  // Por ahora, es solo un placeholder.
  renewalLogs.value = await serviceStore.fetchRenewalLogs(id);
  isLoading.value = false;
};

// Se ejecuta al montar el componente
onMounted(() => {
  if (props.serviceId) {
    fetchRenewalLogs(props.serviceId);
  }
});

// Se ejecuta si el serviceId cambia
watch(() => props.serviceId, (newId) => {
  if (newId) {
    fetchRenewalLogs(newId);
  }
}, { immediate: true });
</script>

<style scoped>
h4 {
  margin-top: 0;
  margin-bottom: 1rem;
}
.renewal-history-table :deep(.p-datatable-table) {
    font-size: 0.9rem;
}

.renewal-history-table :deep(.p-datatable .p-datatable-tbody > tr > td) {
    padding: 0.5rem;
}
</style>
