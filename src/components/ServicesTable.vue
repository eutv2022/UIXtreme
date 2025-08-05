<template>
  <div class="services-table-container">
    <div v-if="services.length > 0">
      <div class="search-bar">
        <span class="p-input-icon-left">
          <i class="pi pi-search" style="font-size: 2rem; color: #2dd4bf"></i>
          <InputText v-model="globalFilter" placeholder="Buscar..." />
        </span>
      </div>

      <div class="table-wrapper">
        <table class="services-html-table">
          <thead>
            <tr>
              <th>Stat</th>
              <th @click="handleSort('id')" :class="{ 'sortable': true, 'sorted-asc': sortField === 'id' && sortOrder === 1, 'sorted-desc': sortField === 'id' && sortOrder === -1 }">ID  <i :class="getSortIcon('id')"></i></th>
              <th @click="handleSort('name')" :class="{ 'sortable': true, 'sorted-asc': sortField === 'name' && sortOrder === 1, 'sorted-desc': sortField === 'name' && sortOrder === -1 }">Nombre Cliente <i :class="getSortIcon('name')"></i></th>
              <th @click="handleSort('username')" :class="{ 'sortable': true, 'sorted-asc': sortField === 'username' && sortOrder === 1, 'sorted-desc': sortField === 'username' && sortOrder === -1 }">Usuario <i :class="getSortIcon('username')"></i></th>
              <th @click="handleSort('purchase_date')" :class="{ 'sortable': true, 'sorted-asc': sortField === 'purchase_date' && sortOrder === 1, 'sorted-desc': sortField === 'purchase_date' && sortOrder === -1 }">Fecha Compra <i :class="getSortIcon('purchase_date')"></i></th>
              <th @click="handleSort('expiration_date')" :class="{ 'sortable': true, 'sorted-asc': sortField === 'expiration_date' && sortOrder === 1, 'sorted-desc': sortField === 'expiration_date' && sortOrder === -1 }">Vencimiento <i :class="getSortIcon('expiration_date')"></i></th>
              <th>Teléfono</th>
              <th @click="handleSort('server')" :class="{ 'sortable': true, 'sorted-asc': sortField === 'server' && sortOrder === 1, 'sorted-desc': sortField === 'server' && sortOrder === -1 }">Servidor <i :class="getSortIcon('server')"></i></th>
              <th>Dispositivos</th>
              <th @click="handleSort('payment_method')" :class="{ 'sortable': true, 'sorted-asc': sortField === 'payment_method' && sortOrder === 1, 'sorted-desc': sortField === 'payment_method' && sortOrder === -1 }">Método de Pago <i :class="getSortIcon('payment_method')"></i></th>
              <th>Monto</th>
              <th v-if="showOwnerColumn">Propietario</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="service in paginatedServices"
              :key="service.id"
              :id="`service-row-${service.id}`"
              :class="{ 'highlight-row': highlightedServiceId === service.id }"
              @dblclick="$emit('editService', service)"
            >
              <td>
                <span :class="['status-badge', getServiceStatus(service).class]">
                  {{ getServiceStatus(service).text }}
                </span>
              </td>
              <td>{{ service.id }}</td>
              <td>{{ service.name }}</td>
              <td>{{ service.username }}</td>
              <td>{{ formatDate(service.purchase_date) }}</td>
              <td>{{ formatDate(service.expiration_date) }}</td>
              <td>{{ formatPhoneNumber(service.phone) }}</td>
              <td>{{ service.server }}</td>
              <td>{{ service.device.join(', ') }}</td>
              <td>{{ service.payment_method }}</td>
              <td>${{ service.amount.toFixed(2) }}</td>
              <td v-if="showOwnerColumn">
                {{ getOwnerUsername(service.owner_id) }}
              </td>
              <td>
                <SplitButton
                  label="Acciones"
                  icon="pi pi-bars"
                  :model="getActionsMenuItems(service)"
                  raised
                  text
                  severity="custom-cyan"
                  class="action-split-button"
                ></SplitButton>
              </td>
            </tr>
            <tr v-if="paginatedServices.length === 0">
              <td :colspan="12" class="no-results">No se encontraron servicios.</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="pagination-controls">
        <Button icon="pi pi-angle-double-left" @click="changePage(1)" :disabled="currentPage === 1" text rounded />
        <Button icon="pi pi-angle-left" @click="changePage(currentPage - 1)" :disabled="currentPage === 1" text rounded />
        <span class="page-info">Página {{ currentPage }} de {{ totalPages }}</span>
        <Button icon="pi pi-angle-right" @click="changePage(currentPage + 1)" :disabled="currentPage === totalPages" text rounded />
        <Button icon="pi pi-angle-double-right" @click="changePage(totalPages)" :disabled="currentPage === totalPages" text rounded />
        <Dropdown
          v-model="itemsPerPage"
          :options="[5, 10, 20, 50]"
          placeholder="Filas"
          class="p-paginator-rpp-options ml-2"
        />
      </div>

    </div>
    <div v-else class="placeholder-content">
      <p>No tienes servicios registrados aún.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue';
import type { Service, UserProfile } from '@/types/Service';

import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import SplitButton from 'primevue/splitbutton';
import Dropdown from 'primevue/dropdown';
import Tag from 'primevue/tag';

interface Props {
  services: Service[];
  highlightedServiceId: number | null;
  getServiceStatus: (service: Service) => { text: string; class: string; daysRemaining: number };
  formatPhoneNumber: (phone: string) => string;
  userRole: string | null;
  showOwnerColumn?: boolean;
  allUserProfiles?: UserProfile[];
}

const props = defineProps<Props>();

const emits = defineEmits([
  'addClient',
  'editService',
  'showServiceInfo',
  'deleteService',
  'renewService',
]);

const currentPage = ref(1);
const itemsPerPage = ref(10);
const sortField = ref<keyof Service>('id');
const sortOrder = ref(-1);
const globalFilter = ref('');

const formatDate = (dateValue: Date | string) => {
  if (!dateValue) return '';
  const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
  if (isNaN(date.getTime())) {
    console.error("formatDate: Valor de fecha inválido proporcionado:", dateValue);
    return 'Fecha inválida';
  }
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

const formatCurrency = (value: number) => {
  return value.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
};

const getOwnerUsername = (ownerId: string | undefined): string => {
  if (!ownerId) {
    return 'N/A';
  }

  if (!props.allUserProfiles || props.allUserProfiles.length === 0) {
    return 'N/A';
  }

  const owner: UserProfile | undefined = props.allUserProfiles.find((profile: UserProfile) => {
    return profile.id === ownerId;
  });

  return owner ? owner.username || 'Desconocido' : 'N/A';
};

const getActionsMenuItems = (service: Service) => {
  return [
    {
      label: 'Renovar',
      icon: 'pi pi-refresh',
      command: () => { emits('renewService', service); }
    },
    {
      label: 'Editar',
      icon: 'pi pi-pencil',
      command: () => { emits('editService', service.id); }
    },
    {
      label: 'Info',
      icon: 'pi pi-info-circle',
      command: () => { emits('showServiceInfo', service); }
    },
    {
      label: 'Eliminar',
      icon: 'pi pi-trash',
      command: () => { emits('deleteService', service.id); },
      disabled: props.userRole !== 'admin'
    }
  ];
};

const handleSort = (field: keyof Service) => {
  if (sortField.value === field) {
    sortOrder.value = sortOrder.value * -1;
  } else {
    sortField.value = field;
    sortOrder.value = 1;
  }
  currentPage.value = 1;
};

const getSortIcon = (field: keyof Service) => {
  if (sortField.value !== field) {
    return 'pi pi-sort-alt';
  }
  return sortOrder.value === 1 ? 'pi pi-sort-amount-up-alt' : 'pi pi-sort-amount-down-alt';
};

const filteredServices = computed(() => {
  if (!globalFilter.value) {
    return props.services;
  }
  const filter = globalFilter.value.toLowerCase();
  return props.services.filter(service =>
    Object.values(service).some(value =>
      String(value).toLowerCase().includes(filter)
    )
  );
});

const sortedServices = computed(() => {
  if (!sortField.value) {
    return filteredServices.value;
  }

  const sorted = [...filteredServices.value].sort((a, b) => {
    const valA = a[sortField.value];
    const valB = b[sortField.value];

    if (valA === null || valA === undefined) return sortOrder.value;
    if (valB === null || valB === undefined) return -sortOrder.value;

    if (typeof valA === 'string' && typeof valB === 'string') {
      return valA.localeCompare(valB) * sortOrder.value;
    }
    if (typeof valA === 'number' && typeof valB === 'number') {
      return (valA - valB) * sortOrder.value;
    }
    if (valA instanceof Date && valB instanceof Date) {
      return (valA.getTime() - valB.getTime()) * sortOrder.value;
    }
    return String(valA).localeCompare(String(valB)) * sortOrder.value;
  });
  return sorted;
});

const totalPages = computed(() => {
  return Math.ceil(sortedServices.value.length / itemsPerPage.value);
});

const paginatedServices = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value;
  const end = start + itemsPerPage.value;
  return sortedServices.value.slice(start, end);
});

const changePage = (pageNumber: number) => {
  if (pageNumber >= 1 && pageNumber <= totalPages.value) {
    currentPage.value = pageNumber;
  }
};

watch(() => props.highlightedServiceId, async (newId) => {
  if (newId !== null) {

    const serviceIndex = sortedServices.value.findIndex(s => s.id === newId);
    if (serviceIndex === -1) {
      return;
    }

    const targetPage = Math.floor(serviceIndex / itemsPerPage.value) + 1;

    if (targetPage !== currentPage.value) {
      currentPage.value = targetPage;
      await nextTick();
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    const element = document.getElementById(`service-row-${newId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
    }
  }
});

watch(itemsPerPage, () => {
  currentPage.value = 1;
});

watch(totalPages, (newTotalPages) => {
  if (currentPage.value > newTotalPages && newTotalPages > 0) {
    currentPage.value = newTotalPages;
  } else if (newTotalPages === 0) {
    currentPage.value = 1;
  }
});
watch(() => props.allUserProfiles, (newProfiles) => {
  if (newProfiles && newProfiles.length > 0) {
  }
}, { deep: true, immediate: true }); 


onMounted(() => {
});
</script>

<style scoped>
.services-table-container {
  overflow-x: auto;
  margin-top: 1rem;
  background-color: var(--surface-a);
  border-radius: var(--border-radius);
  box-shadow: var(--surface-shadow);
  padding: 1.5rem;
}

.table-header-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.table-header-controls h4 {
  margin: 0;
  color: var(--text-color);
}

.add-client-button {
  min-width: 120px;
}

.search-bar {
  margin-bottom: 1rem;
}

.search-bar .p-input-icon-left .p-inputtext {
  width: 100%;
  padding-left: 2.5rem;
}

.services-html-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 1rem;
  font-size: 0.9rem;
}

.services-html-table th,
.services-html-table td {
  border: 1px solid var(--surface-border);
  padding: 0.75rem 0.5rem;
  text-align: left;
  vertical-align: middle;
}
.services-html-table th:nth-child(7), 
.services-html-table td:nth-child(7) { 
  white-space: nowrap; 
  min-width: 120px; 
  
}
.services-html-table th {
  background-color: var(--surface-b);
  color: var(--text-color-secondary);
  font-weight: bold;
  cursor: pointer;
  transition: background-color 0.2s;
  position: relative;
}

.services-html-table th:hover {
  background-color: var(--surface-hover);
}

.services-html-table th.sortable i {
  position: absolute;
  right: 0.5rem;
  top: 50%;
  transform: translateY(-50%);
  font-size: 0.7rem;
}

.services-html-table th.sortable.sorted-asc,
.services-html-table th.sortable.sorted-desc {
  background-color: var(--primary-color-light);
}

.services-html-table tbody tr {
  background-color: var(--surface-card);
  transition: background-color 0.2s;
}

.services-html-table tbody tr:nth-child(even) {
  background-color: var(--surface-ground);
}

.services-html-table tbody tr:hover {
  background-color: var(--surface-hover);
}

.services-html-table tbody tr.highlight-row {
  background-color: var(--blue-200) !important;
  border-left: 5px solid var(--blue-600) !important;
  box-shadow: 0 0 10px rgba(0, 123, 255, 0.5) !important;
  animation: highlightFade 3s forwards;
}

@keyframes highlightFade {
  0% {
    background-color: var(--blue-200) !important;
    border-left-color: var(--blue-600) !important;
    box-shadow: 0 0 10px rgba(0, 123, 255, 0.5) !important;
  }
  100% {
    background-color: transparent !important;
    border-left-color: transparent !important;
    box-shadow: none !important;
  }
}

.service-row-id-anchor {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

.status-badge {
  display: inline-flex;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  margin: 0 auto;
  border: 1px solid currentColor;
  align-items: center;
  justify-content: center;
  color: red;
  font-weight: bold;
  font-family: Cambria;
}

.status-badge.status-expired { background-color: #F44336; border-color: #F44336; }
.status-badge.status-warning { background-color: #FFC107; border-color: #FFC107; }
.status-badge.status-active { background-color: #4CAF50; border-color: #4CAF50; }

.no-results {
  text-align: center;
  padding: 2rem;
  color: var(--text-color-secondary);
  font-style: italic;
}

.pagination-controls {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: 1.5rem;
  padding: 0.5rem;
  background-color: var(--surface-a);
  border-radius: var(--border-radius);
  box-shadow: var(--surface-shadow);
  gap: 0.5rem;
}

.pagination-controls .p-button {
  min-width: 2rem;
  height: 2rem;
  padding: 0;
}

.pagination-controls .page-info {
  margin: 0 1rem;
  color: var(--text-color);
  font-weight: bold;
}

.p-paginator .p-button.p-button-text {
  color: var(--primary-color);
}

.p-paginator .p-button.p-button-text:hover {
  background-color: var(--surface-hover);
}

:deep(.p-paginator-rpp-options.p-dropdown) {
  min-width: 5rem;
}


</style>
