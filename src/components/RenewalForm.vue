<template>
  <div class="renewal-form-container">
    <div class="p-fluid">
      <!-- Campo Cliente -->
      <div class="p-field">
        <label for="renewal-client-name">Cliente</label>
        <InputText id="renewal-client-name" :value="service.name" disabled />
      </div>

      <!-- Campo Fecha de Vencimiento Actual -->
      <div class="p-field">
        <label for="renewal-current-expiration">Fecha de Vencimiento Actual</label>
        <InputText id="renewal-current-expiration" :value="formatDate(service.expiration_date)" disabled />
      </div>

      <!-- LÓGICA CONDICIONAL: Muestra un campo u otro según el rol -->
      <template v-if="userRole === 'admin'">
        <!-- Campo Nueva Fecha de Vencimiento para Admin -->
        <div class="p-field">
          <label for="renewal-new-expiration" class="required-label">Nueva Fecha de Vencimiento</label>
          <Calendar
            id="renewal-new-expiration"
            v-model="newExpirationDate"
            :minDate="minExpirationDate"
            dateFormat="dd/mm/yy"
            showIcon
            placeholder="Selecciona una fecha"
          />
        </div>
      </template>

      <template v-else-if="userRole === 'user'">
        <!-- Campo Paquete para User -->
        <div class="p-field">
          <label for="renewal-package-select" class="required-label">Selecciona un Paquete</label>
          <Dropdown
            id="renewal-package-select"
            v-model="selectedPackage"
            :options="packageOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="Selecciona un paquete"
            required
          />
        </div>
      </template>

      <!-- Campo Servidor -->
      <div class="p-field">
        <label for="renewal-server-select" class="required-label">Servidor</label>
        <Dropdown
          id="renewal-server-select"
          v-model="selectedServer"
          :options="serverOptions"
          optionLabel="label"
          optionValue="value"
          placeholder="Selecciona Servidor"
          required
        />
      </div>

      <!-- Campo Monto -->
      <div class="p-field">
        <label for="renewal-amount">Monto</label>
        <InputNumber
          id="renewal-amount"
          v-model="newAmount"
          mode="currency"
          currency="USD"
          locale="en-US"
          :minFractionDigits="0"
          :maxFractionDigits="2"
          required
        />
      </div>
    </div>
    
    <div class="p-d-flex p-jc-end p-mt-4">
      <Button
        label="Cancelar"
        icon="pi pi-times"
        class="p-button-text p-button-secondary mr-2"
        @click="$emit('cancel')"
      />
      <Button
        label="Renovar"
        icon="pi pi-check"
        :disabled="!isFormValid"
        @click="handleSave"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Calendar from 'primevue/calendar';
import type { Service, NewServiceInput } from '@/types/Service';
import Dropdown from 'primevue/dropdown';
import InputNumber from 'primevue/inputnumber';

interface Props {
  service: Service;
  serverOptions: { label: string; value: string; }[];
  userRole: 'admin' | 'user';
}

const props = defineProps<Props>();
const emits = defineEmits(['save', 'cancel']);

const newExpirationDate = ref<Date | null>(null);
const selectedPackage = ref<number | null>(null);
const selectedServer = ref<string | null>(null);
const newAmount = ref<number>(0);

const packageOptions = [
  { label: '1 mes', value: 1 },
  { label: '3 meses', value: 3 },
  { label: '6 meses', value: 6 },
  { label: '12 meses', value: 12 },
  { label: '15 meses', value: 15 },
];

const minExpirationDate = computed(() => {
  return props.service?.expiration_date ? new Date(props.service.expiration_date) : new Date();
});

// IDs de los campos para la accesibilidad, de forma consistente.
const clientNameId = 'renewal-client-name';
const currentExpirationId = 'renewal-current-expiration';
const newExpirationId = 'renewal-new-expiration';
const packageSelectId = 'renewal-package-select';
const serverSelectId = 'renewal-server-select';
const amountId = 'renewal-amount';

// Lógica de validación del formulario
const isFormValid = computed(() => {
  const commonValid = !!selectedServer.value && newAmount.value > 0;
  if (props.userRole === 'admin') {
    return !!newExpirationDate.value && commonValid;
  }
  // Para el rol 'user', la fecha se calcula automáticamente
  return !!selectedPackage.value && commonValid;
});

// Este watcher se encarga de inicializar los valores al abrir el formulario.
watch(() => props.service, (newService) => {
  if (newService) {
    newExpirationDate.value = newService.expiration_date ? new Date(newService.expiration_date) : new Date();
    selectedServer.value = newService.server || null;
    newAmount.value = newService.amount || 0;
    selectedPackage.value = null; 
  }
}, { immediate: true, deep: true });

// Este watcher se encarga de actualizar la fecha cuando se selecciona un paquete.
watch(selectedPackage, (newPackage) => {
  if (newPackage !== null && newPackage > 0) {
    const currentExpiration = props.service?.expiration_date ? new Date(props.service.expiration_date) : new Date();
    const futureDate = new Date(currentExpiration);
    futureDate.setMonth(currentExpiration.getMonth() + newPackage);
    newExpirationDate.value = futureDate;
  }
});

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

const handleSave = () => {
  if (isFormValid.value) {
    const updatedService: Partial<NewServiceInput> = {
      id: props.service.id,
      expiration_date: newExpirationDate.value || undefined,
      server: selectedServer.value || undefined,
      amount: newAmount.value || undefined,
    };
    emits('save', updatedService);
  }
};
</script>

<style scoped>
.renewal-form-container {
  padding: 2rem;
  border-radius: var(--border-radius);
  background-color: var(--surface-card);
}

.p-field {
  margin-bottom: 1.5rem;
}

.p-field label {
  font-weight: bold;
  color: var(--text-color);
  display: block;
  margin-bottom: 0.5rem;
}
</style>
