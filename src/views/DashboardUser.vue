<template>
  <div class="dashboard-user-view">
    <Toast />

    <div class="dashboard-section-header">
      <h2>Mis Servicios</h2>
      <Button label="Añadir Nuevo Servicio" icon="pi pi-plus" class="add-service-button" @click="handleAddClient" />
    </div>

    <ServicesTable
      :services="serviceStore.services"
      :getServiceStatus="serviceStore.getServiceStatus"
      :userRole="serviceStore.userRole"
      :highlightedServiceId="serviceStore.highlightedServiceId"
      :formatPhoneNumber="serviceStore.formatPhoneNumber"
      @editService="handleEditClient"
      @deleteService="handleDeleteService"
      @showServiceInfo="serviceStore.showServiceInfoScreen"
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
import Toast from 'primevue/toast';
import { useToast } from 'primevue/usetoast';
import ServiceInfoScreen from '@/components/ServiceInfoScreen.vue';
import type { NewServiceInput, Service } from '@/types/Service';
import type { Store } from 'pinia'; 


const serviceStore: ReturnType<typeof useServiceStore> = useServiceStore();
const toast = useToast();

const isClientFormDialogVisible = computed({
  get: () => serviceStore.isAddingClient,
  set: (val) => serviceStore.setClientFormActive(val),
});

const isConfirmDeleteDialogVisible = ref(false);
const serviceToDeleteId = ref<number | null>(null);

onMounted(async () => {
  await serviceStore.fetchUser();
  serviceStore.fetchServices();
});

watch([isClientFormDialogVisible, () => serviceStore.isShowingServiceInfo], ([isAdding, isShowingInfo]) => {
  if (isAdding || isShowingInfo) {
    document.body.classList.add('no-scroll-body');
  } else {
    document.body.classList.remove('no-scroll-body');
  }
});

// Limpieza al desmontar el componente
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
  .add-service-button {
    width: 100%;
  }
}

</style>