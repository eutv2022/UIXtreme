<template>
  <div class="client-form-container">
    <form @submit.prevent="submitForm" class="p-fluid p-formgrid p-grid">
      <!-- Fila 1: Nombre Cliente, Usuario, Teléfono -->
      <div class="p-field p-col-12 md:p-col-6">
        <label for="name">Nombre Cliente</label>
        <InputText id="name" v-model="newServiceInternal.name" required autofocus />
      </div>
      <div class="p-field p-col-12 md:p-col-6">
        <label for="username">Usuario</label>
        <InputText id="username" v-model="newServiceInternal.username" required />
      </div>
      <div class="p-field p-col-12 md:p-col-6">
        <label for="phone">Teléfono</label>
        <InputMask id="phone" v-model="newServiceInternal.phone" mask="(999) 999-9999" placeholder="(999) 999-9999" />
      </div>

      <!-- Fila 2: Fecha de Compra, Fecha de Vencimiento -->
      <div class="p-field p-col-12 md:p-col-6">
        <label for="purchase_date">Fecha de Compra</label>
        <Calendar id="purchase_date" v-model="newServiceInternal.purchase_date" dateFormat="dd/mm/yy" showIcon />
      </div>
      <div class="p-field p-col-12 md:p-col-6">
        <label for="expiration_date">Fecha de Vencimiento</label>
        <Calendar id="expiration_date" v-model="newServiceInternal.expiration_date" dateFormat="dd/mm/yy" showIcon />
      </div>

      <!-- Fila 3: Servidor -->
      <div class="p-field p-col-12 md:p-col-6">
        <label for="server">Servidor</label>
        <Dropdown id="server" v-model="newServiceInternal.server" :options="serverOptions" optionLabel="label" optionValue="value" placeholder="Selecciona Servidor" required />
      </div>

      <!-- Fila 4: Dispositivos -->
      <div class="p-field p-col-12 md:p-col-6">
        <label for="device">Dispositivos</label>
        <span class="p-input-icon-right">
          <i class="pi pi-bars" @click="toggleDeviceDropdown"></i>
          <InputText
            id="device"
            :value="getDeviceSummary"
            readonly
            @click="toggleDeviceDropdown"
            placeholder="Seleccione dispositivos"
          />
        </span>
        <OverlayPanel ref="op" appendTo="body" :showCloseIcon="true" id="overlay_panel" class="device-overlay-panel">
          <div class="device-management-grid">
            <div v-for="deviceType in deviceOptions" :key="deviceType" class="device-item">
              <span class="device-name">{{ deviceType }}</span>
              <div class="device-controls">
                <Button icon="pi pi-minus" class="p-button-rounded p-button-text p-button-sm" @click="decrementDevice(deviceType)" :disabled="!newServiceInternal.deviceCounts || newServiceInternal.deviceCounts[deviceType] === 0" />
                <span class="device-count">{{ newServiceInternal.deviceCounts ? newServiceInternal.deviceCounts[deviceType] || 0 : 0 }}</span>
                <Button icon="pi pi-plus" class="p-button-rounded p-button-text p-button-sm" @click="incrementDevice(deviceType)" />
              </div>
            </div>
          </div>
        </OverlayPanel>
      </div>

      <!-- Fila 5: Método de Pago, Monto -->
      <div class="p-field p-col-12 md:p-col-6">
        <label for="payment_method">Método de Pago</label>
        <Dropdown id="payment_method" v-model="newServiceInternal.payment_method" :options="paymentMethodOptions" optionLabel="label" optionValue="value" placeholder="Selecciona Método" required />
      </div>
      <div class="p-field p-col-12 md:p-col-6">
        <label for="amount">Monto</label>
        <InputNumber id="amount" v-model="newServiceInternal.amount" mode="currency" currency="USD" locale="en-US" :minFractionDigits="0" :maxFractionDigits="2" required />
      </div>

      <!-- Fila 6: Owner ID (solo para administradores) -->
      <div v-if="canEditOwner" class="p-field p-col-12">
        <label for="owner_id">Propietario del Servicio</label>
        <Dropdown
          id="owner_id"
          v-model="newServiceInternal.owner_id"
          :options="userOptions"
          optionLabel="username"
          optionValue="id"
          placeholder="Selecciona un propietario"
          filter
          showClear
        />
      </div>

      <!-- Fila 7: Nota -->
      <div class="p-field p-col-12">
        <label for="note">Nota (Opcional)</label>
        <Textarea id="note" v-model="newServiceInternal.note" rows="3" autoResize />
      </div>

      <div class="form-actions p-col-12">
        <Button type="button" label="" icon="pi pi-times" severity="danger" rounded @click="cancelForm" />
        <Button type="submit" :label="newServiceInternal.id ? '' : ''" icon="pi pi-check" severity="success" rounded/>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import type { NewServiceInput, ServiceImage } from '@/types/Service';

// PrimeVue Components
import InputText from 'primevue/inputtext';
import Button from 'primevue/button';
import Calendar from 'primevue/calendar';
import Dropdown from 'primevue/dropdown';
import InputNumber from 'primevue/inputnumber';
import OverlayPanel from 'primevue/overlaypanel';
import Textarea from 'primevue/textarea';
import InputMask from 'primevue/inputmask';

interface Props {
  newService: NewServiceInput;
  serverOptions: { label: string; value: string; }[];
  paymentMethodOptions: { label: string; value: string; }[];
  deviceOptions: string[];
  initialDeviceCounts: () => { [key: string]: number };
  parseDeviceArrayToCounts: (deviceArray: string[] | null) => { [key: string]: number };
  formatDeviceToArray: (deviceCounts: { [key: string]: number } | undefined) => string[];
  canEditOwner?: boolean;
  userOptions?: { id: string; username: string }[];
}

const props = withDefaults(defineProps<Props>(), {
  canEditOwner: false,
  userOptions: () => [],
});

const emit = defineEmits(['update:newService', 'save', 'cancel']);

const newServiceInternal = ref<NewServiceInput>({
  ...props.newService,
  purchase_date: props.newService.purchase_date instanceof Date && !isNaN(props.newService.purchase_date.getTime())
    ? props.newService.purchase_date
    : (typeof props.newService.purchase_date === 'string' ? new Date(props.newService.purchase_date) : new Date()),
  expiration_date: props.newService.expiration_date instanceof Date && !isNaN(props.newService.expiration_date.getTime())
    ? props.newService.expiration_date
    : (typeof props.newService.expiration_date === 'string' ? new Date(props.newService.expiration_date) : new Date()),
  deviceCounts: props.newService.deviceCounts || props.initialDeviceCounts(),
  amount: typeof props.newService.amount === 'number' ? props.newService.amount : parseFloat(String(props.newService.amount)) || 0,
  note: props.newService.note === '' ? null : props.newService.note,
  server: props.newService.server || '',
  payment_method: props.newService.payment_method || '',
  images: props.newService.images || [],
});

watch(() => props.newService, (newValue) => {
  const isSameServiceById = newValue.id === newServiceInternal.value.id;
  const isDeeplyEqual = JSON.stringify(newValue) === JSON.stringify(newServiceInternal.value);

  if (!isSameServiceById || !isDeeplyEqual) {
    newServiceInternal.value = {
      ...newValue,
      purchase_date: newValue.purchase_date instanceof Date && !isNaN(newValue.purchase_date.getTime())
        ? newValue.purchase_date
        : (typeof newValue.purchase_date === 'string' ? new Date(newValue.purchase_date) : new Date()),
      expiration_date: newValue.expiration_date instanceof Date && !isNaN(newValue.expiration_date.getTime())
        ? newValue.expiration_date
        : (typeof newValue.expiration_date === 'string' ? new Date(newValue.expiration_date) : new Date()),
      deviceCounts: newValue.deviceCounts || props.parseDeviceArrayToCounts(newValue.device || null),
      amount: typeof newValue.amount === 'number' ? newValue.amount : parseFloat(String(newValue.amount)) || 0,
      note: newValue.note === '' ? null : newValue.note,
      server: newValue.server || '',
      payment_method: newValue.payment_method || '',
      images: newValue.images || [],
    };
  } else {
  }
}, { deep: true, immediate: true });

let lastEmittedValueString = JSON.stringify(newServiceInternal.value);

watch(newServiceInternal, (newVal) => {
  const currentStringifiedValue = JSON.stringify(newVal);
  if (currentStringifiedValue !== lastEmittedValueString) {
    emit('update:newService', newVal);
    lastEmittedValueString = currentStringifiedValue;
  } else {
  }
}, { deep: true });

onMounted(() => {
  if (!newServiceInternal.value.deviceCounts || Object.keys(newServiceInternal.value.deviceCounts).length === 0) {
    newServiceInternal.value.deviceCounts = props.initialDeviceCounts();
  }
});

const op = ref<InstanceType<typeof OverlayPanel> | null>(null);


const getDeviceSummary = computed(() => {
  if (!newServiceInternal.value.deviceCounts) return 'Seleccione dispositivos';
  const selectedDevices = Object.keys(newServiceInternal.value.deviceCounts)
    .filter(type => newServiceInternal.value.deviceCounts![type] > 0)
    .map(type => `${type}: ${newServiceInternal.value.deviceCounts![type]}`);
  return selectedDevices.length > 0 ? selectedDevices.join(', ') : 'Seleccione dispositivos';
});

const incrementDevice = (deviceType: string) => {
  if (newServiceInternal.value.deviceCounts) {
    newServiceInternal.value.deviceCounts[deviceType] = (newServiceInternal.value.deviceCounts[deviceType] || 0) + 1;
  }
};

const decrementDevice = (deviceType: string) => {
  if (newServiceInternal.value.deviceCounts && newServiceInternal.value.deviceCounts[deviceType] > 0) {
    newServiceInternal.value.deviceCounts[deviceType]--;
  }
};

const toggleDeviceDropdown = (event: Event) => {
  if (op.value) {
    op.value.toggle(event);
  } else {
    console.warn('OverlayPanel ref (op.value) is null. Make sure ref="op" is on your OverlayPanel component in the template.');
  }
};

const submitForm = () => {
  if (typeof newServiceInternal.value.purchase_date === 'string') {
    newServiceInternal.value.purchase_date = new Date(newServiceInternal.value.purchase_date);
  }
  if (typeof newServiceInternal.value.expiration_date === 'string') {
    newServiceInternal.value.expiration_date = new Date(newServiceInternal.value.expiration_date);
  }

  newServiceInternal.value.device = props.formatDeviceToArray(newServiceInternal.value.deviceCounts);

  emit('save', newServiceInternal.value);
};

const cancelForm = () => {
  emit('cancel');
};
</script>

<style scoped>
.client-form-container {
  background-color: var(--surface-card);
  padding: 2rem;
  border-radius: var(--border-radius);
  box-shadow: var(--surface-shadow);
  display: flex;
  flex-direction: column;
  height: 100%;
}

/* Asegúrate de que el área de los campos sea scrollable */
.client-form-container > div:first-of-type { 
  flex-grow: 1; 
  overflow-y: auto;
  padding-right: 1rem;
  padding-bottom: 3rem;
}


.p-field {
  margin-bottom: 1.5rem;
}


.form-actions {
  display: flex;
  justify-content: center;
  gap: 1rem;
  margin-top: 2rem;
  flex-shrink: 0; 
  padding: 1rem; 
  border-top: 1px solid var(--surface-border); 
  background-color: var(--surface-card); 
}

@media (max-width: 768px) {
  .client-form-container {
    padding: 1rem;
  }
  .p-field label {
    font-size: 0.95rem;
  }
  .p-field :deep(.p-inputtext),
  .p-field :deep(.p-dropdown),
  .p-field :deep(.p-calendar),
  .p-field :deep(.p-inputnumber),
  .p-field :deep(.p-textarea),
  .p-field :deep(.p-inputmask) {
    font-size: 0.9rem;
    padding: 0.6rem 0.75rem;
  }
  .device-management-grid {
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }
  .form-actions {
    gap: 0.75rem; 
    flex-wrap: wrap; 
    justify-content: center; 
  }
  .form-actions .p-button {
    min-width: 40px; 
    width: auto; 
    height: 40px; 
    padding: 0;
  }
}

@media (max-width: 480px) {
  .client-form-container {
    padding: 0.75rem;
  }
  .p-field label {
    font-size: 0.9rem;
  }
  .p-field :deep(.p-inputtext),
  .p-field :deep(.p-dropdown),
  .p-field :deep(.p-calendar),
  .p-field :deep(.p-inputnumber),
  .p-field :deep(.p-textarea),
  .p-field :deep(.p-inputmask) {
    font-size: 0.85rem;
    padding: 0.5rem 0.6rem;
  }
}
</style>
