<template>
  <div class="dashboard-user-view">
    <Toast />

    <div class="dashboard-section-header">
      <div class="left-actions">
    <Button label="Pagos" icon="pi pi-dollar" severity="sucess" rounded text raised @click="router.push({ name: 'Pagos' })"/>
    </div>
      
  
    <div class="right-actions">
      <h2>Mis Servicios</h2>
      <Button label="Añadir Nuevo Servicio" icon="pi pi-plus" class="add-service-button" @click="handleAddClient" />
    </div>
    </div>
    <ServicesTable
      :services="serviceStore.services"
      :getServiceStatus="serviceStore.getServiceStatus"
      :userRole="computedUserRole"
      :highlightedServiceId="serviceStore.highlightedServiceId"
      :formatPhoneNumber="serviceStore.formatPhoneNumber"
      @editService="handleEditClient"
      @deleteService="handleDeleteService"
      @showServiceInfo="serviceStore.showServiceInfoScreen"
      @renewService="handleRenewService"
    />

    <!-- Dialog para Añadir/Editar Cliente/Servicio -->
    <Dialog
      v-model:visible="serviceStore.isAddingClient"
      :header="serviceStore.newServiceFormData.id ? 'Editar Cliente/Servicio' : 'Añadir Nuevo Cliente/Servicio'"
      :modal="true"
      :draggable="false"
      :resizable="false"
      @hide="handleDialogHide"
      :breakpoints="{'960px': '75vw', '640px': '90vw'}"
      position="top"
      appendTo="body"
    >
      <ClientForm
        v-if="serviceStore.isAddingClient"
        v-model:newService="(serviceStore.newServiceFormData as NewServiceInput)"
        :serverOptions="serviceStore.serverOptions"
        :paymentMethodOptions="serviceStore.paymentMethodOptions"
        :deviceOptions="serviceStore.deviceOptions"
        :initialDeviceCounts="serviceStore.initialDeviceCounts"
        :parseDeviceArrayToCounts="serviceStore.parseDeviceArrayToCounts"
        :formatDeviceToArray="(counts) => serviceStore.formatDeviceCountsToArray(counts)"
        :canEditOwner="serviceStore.userRole === 'admin'"
        :userOptions="serviceStore.userRole === 'admin' ? serviceStore.allUserProfiles : []"
        @save="handleSaveClient"
        @cancel="handleCancelForm"
        :userRole="computedUserRole"
      />
    </Dialog>

    <!-- Dialog para Renovar Servicio -->
    <Dialog
      v-model:visible="isRenewalDialogVisible"
      header="Renovar Servicio"
      :modal="true"
      :draggable="false"
      :resizable="false"
      @hide="handleDialogHideRenew"
      :breakpoints="{'960px': '75vw', '640px': '90vw'}"
      position="top"
      appendTo="body"
    >
      <RenewalForm
        v-if="isRenewalDialogVisible && serviceToRenew"
        :service="serviceToRenew"
        :serverOptions="serviceStore.serverOptions"
        :userRole="computedUserRole"
        @save="handleSaveRenewal"
        @cancel="handleCancelRenewal"
      />
    </Dialog>

    <!-- Dialog de confirmación de eliminación -->
    <Dialog
      v-model:visible="isConfirmDeleteDialogVisible"
      header="Confirmar Eliminación"
      :modal="true"
      :draggable="false"
      :resizable="false"
      class="custom-confirm-dialog-wrapper"
    >
      <div class="confirmation-content">
        <i class="pi pi-exclamation-triangle mr-3" style="font-size: 2rem" />
        <span>¿Estás seguro de que quieres eliminar este servicio?</span>
      </div>
      <template #footer>
        <Button label="No" icon="pi pi-times" class="p-button-text" @click="isConfirmDeleteDialogVisible = false" />
        <Button label="Sí" icon="pi pi-check" class="p-button-text" @click="confirmDeleteService" />
      </template>
    </Dialog>

    <!-- Dialog para mostrar información del servicio (ServiceInfoScreen) -->
    <Dialog
      v-model:visible="serviceStore.isShowingServiceInfo"
      :header="serviceStore.currentServiceForInfo?.name ? `${serviceStore.currentServiceForInfo.name} - Información` : 'Información del Servicio'"
      :modal="true"
      :draggable="false"
      :resizable="false"
      @hide="serviceStore.closeServiceInfoScreen"
      :breakpoints="{'960px': '75vw', '640px': '90vw'}"
      position="top"
      appendTo="body"
      class="service-info-dialog"
      :contentStyle="{ 'max-height': '70vh', 'overflow-y': 'auto' }"
    >
      <!-- Aquí renderizamos el componente ServiceInfoScreen.vue -->
      <ServiceInfoScreen
        v-if="serviceStore.currentServiceForInfo"
        :service="serviceStore.currentServiceForInfo"
        :initialDeviceCounts="serviceStore.initialDeviceCounts"
        :parseDeviceArrayToCounts="serviceStore.parseDeviceArrayToCounts"
        :formatDeviceCountsToArray="serviceStore.formatDeviceCountsToArray"
        :uploadServiceImage="serviceStore.uploadServiceImage"
        :deleteServiceImage="serviceStore.deleteServiceImage"
        :updateServiceNote="serviceStore.updateServiceNote"
        @close="serviceStore.closeServiceInfoScreen"
      />
      <template #footer>
        <Button label="Cerrar" icon="pi pi-times" @click="serviceStore.closeServiceInfoScreen" />
      </template>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch, onUnmounted } from 'vue';
import { useServiceStore } from '@/stores/services';
import ServicesTable from '@/components/ServicesTable.vue';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import ClientForm from '@/components/ClientForm.vue';
import RenewalForm from '@/components/RenewalForm.vue'; // Nuevo componente
import Toast from 'primevue/toast';
import { useToast } from 'primevue/usetoast';
import ServiceInfoScreen from '@/components/ServiceInfoScreen.vue';
import type { NewServiceInput, Service } from '@/types/Service';
import type { Store } from 'pinia'; 
import { useRouter } from 'vue-router';

const serviceStore: ReturnType<typeof useServiceStore> = useServiceStore();
const toast = useToast();
const computedUserRole = computed(() => {
   // Aseguramos que el rol sea 'admin' o 'user' para evitar errores de tipo.
  const role = serviceStore.userRole;
  if (role === 'admin' || role === 'user') {
    return role;
  }
  return 'user'; // Valor por defecto si el rol no es válido o es nulo.
});
const router = useRouter();
const isClientFormDialogVisible = computed({
  get: () => serviceStore.isAddingClient,
  set: (val) => serviceStore.setClientFormActive(val),
});

const isConfirmDeleteDialogVisible = ref(false);
const serviceToDeleteId = ref<number | null>(null);

// Nuevos estados y funciones para la renovación
const serviceToRenew = ref<Service | null>(null);
const isRenewalDialogVisible = ref(false);

onMounted(async () => {
  await serviceStore.fetchUser();
  serviceStore.fetchServices();
});

watch([isClientFormDialogVisible, () => serviceStore.isShowingServiceInfo, isRenewalDialogVisible], ([isAdding, isShowingInfo, isRenewing]) => {
  if (isAdding || isShowingInfo || isRenewing) {
    document.body.classList.add('no-scroll-body');
  } else {
    document.body.classList.remove('no-scroll-body');
  }
});

onUnmounted(() => {
  document.body.classList.remove('no-scroll-body');
});

const handleAddClient = () => {
  serviceStore.resetNewServiceFormData();
  serviceStore.setClientFormActive(true);
};

const handleEditClient = (serviceId: number) => {
  const serviceToEdit = serviceStore.services.find(s => s.id === serviceId);
  if (serviceToEdit) { 
    serviceStore.handleEditService(serviceToEdit);
  } else {
    console.error(`DashboardUser: No se encontró el servicio con ID ${serviceId} para editar.`);
    toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudo encontrar el servicio para editar.', life: 3000 });
  }
};

const handleSaveClient = async () => {
  try {
    let success = false;
    if (serviceStore.newServiceFormData.id) {
      success = await serviceStore.updateService(serviceStore.newServiceFormData);
    } else {
      success = await serviceStore.saveNewService(serviceStore.newServiceFormData);
    }
    
    if (success) {
      serviceStore.setClientFormActive(false);
      toast.add({ severity: 'success', summary: 'Éxito', detail: 'Servicio guardado correctamente', life: 3000 });
    }
  } catch (error: any) {
    console.error('Error al guardar el servicio:', error.message);
    toast.add({ severity: 'error', summary: 'Error', detail: `Error al guardar el servicio: ${error.message}`, life: 5000 });
  }
};

const handleCancelForm = () => {
  serviceStore.setClientFormActive(false);
  serviceStore.resetNewServiceFormData();
};

const handleDeleteService = (serviceId: number) => {
  serviceToDeleteId.value = serviceId;
  isConfirmDeleteDialogVisible.value = true;
};

const confirmDeleteService = async () => {
  if (serviceToDeleteId.value !== null) {
    try {
      const success = await serviceStore.deleteService(serviceToDeleteId.value);
      if (success) {
        isConfirmDeleteDialogVisible.value = false;
        toast.add({ severity: 'success', summary: 'Éxito', detail: 'Servicio eliminado correctamente.', life: 3000 });
      }
    } catch (error: any) {
      console.error('Error al eliminar el servicio:', error.message);
      toast.add({ severity: 'error', summary: 'Error', detail: `Error al eliminar el servicio: ${error.message}`, life: 5000 });
    } finally {
      serviceToDeleteId.value = null;
    }
  }
};

const handleDialogHide = () => {
  serviceStore.resetNewServiceFormData();
};

const handleRenewService = (service: Service) => {
  serviceToRenew.value = service;
  isRenewalDialogVisible.value = true;
};

const handleSaveRenewal = async (updatedService: Partial<NewServiceInput>) => {
    try {
    if (!serviceToRenew.value || !serviceToRenew.value.id) {
      toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudo encontrar el servicio para renovar.', life: 5000 });
      return;
    }

    // Aumentar el contador de renovaciones
    const newRenewalCounter = (serviceToRenew.value.renewal_counter || 0) + 1;
    updatedService.renewal_counter = newRenewalCounter;

    // Llamar a la función del store para actualizar el servicio en Supabase.
    const success = await serviceStore.updateService(updatedService);

    if (success) {
      // Si la actualización es exitosa, creamos el registro de la renovación
      const renewalLog = {
        service_id: serviceToRenew.value.id,
        client_name: serviceToRenew.value.name,
        username: serviceToRenew.value.username,
        renewal_number: newRenewalCounter,
        server: serviceToRenew.value.server,
        payment_method: serviceToRenew.value.payment_method,
        amount: serviceToRenew.value.amount,
        owner_username: serviceStore.userProfile?.username || 'admin',
        created_at: new Date().toISOString(),
      };
      
      const logSuccess = await serviceStore.addRenewalLog(renewalLog);

      if (logSuccess) {
        isRenewalDialogVisible.value = false;
        toast.add({ severity: 'success', summary: 'Éxito', detail: 'Servicio renovado correctamente.', life: 3000 });
      } else {
        toast.add({ severity: 'warn', summary: 'Advertencia', detail: 'Servicio actualizado, pero falló el registro de la renovación.', life: 5000 });
      }

    } else {
      toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudo renovar el servicio.', life: 5000 });
    }
  } catch (error: any) {
    console.error('Error al renovar el servicio:', error.message);
    toast.add({ severity: 'error', summary: 'Error', detail: `Error al renovar el servicio: ${error.message}`, life: 5000 });
  }
};


const handleCancelRenewal = () => {
  isRenewalDialogVisible.value = false;
  serviceToRenew.value = null;
};

const handleDialogHideRenew = () => {
  serviceToRenew.value = null;
};

const scrollToServiceAndHighlight = (id: number) => {
  serviceStore.setHighlightedService(id);
};

</script>

<style scoped>

.dashboard-section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.dashboard-section-header h2 {
  margin: 0;
  font-size: 1.8rem;
  color: var(--text-color);
}
.add-service-button {
  flex-shrink: 0;
}

.custom-confirm-dialog-wrapper :deep(.p-dialog-header),
.custom-confirm-dialog-wrapper :deep(.p-dialog-content),
.custom-confirm-dialog-wrapper :deep(.p-dialog-footer) {
  padding: 0;
  background: transparent;
  border: none;
}

.custom-confirm-dialog-wrapper :deep(.p-dialog) {
  background: transparent;
  box-shadow: none;
  border: none;
}

:deep(.p-dialog .client-form-container) {
  padding: 2rem;
}

.service-info-dialog :deep(.p-dialog-content) {
  padding: 0 !important;
}
.left-actions {
  display: flex;
  gap: 1rem;
  padding: 1.5rem 0;
}

@media (max-width: 768px) {
  .dashboard-section-header {
    flex-direction: column;
    align-items: flex-start;
 
  }
  .dashboard-section-header h2 {
    width: 100%;
    text-align: center;
    margin-bottom: 0.5rem;
  }
   .dashboard-actions-header {
    flex-direction: column;
    align-items: flex-start;
  }
  .dashboard-actions-header .left-actions {
    width: 100%;
    justify-content: center; /* Centra el h2 y el botón en el móvil */
    margin-bottom: 1rem;
  }
  .dashboard-actions-header .right-actions {
    width: 100%;
  }
  .add-service-button {
    width: 100%;
  }
}


</style>
