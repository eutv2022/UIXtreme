<template>
  <div class="dashboard-admin-view">
    <Toast />

   <div class="dashboard-section-header">
      <div class="left-actions"> 
        <SplitButton label="Datos" :model="importExportItems" severity="sucess" rounded text raised />
        <Button label="Ver Estadísticas" icon="pi pi-chart-bar" severity="sucess" rounded text raised @click="handleViewStats" />
        <Button label="Pagos" icon="pi pi-dollar" severity="sucess" rounded text raised @click="router.push({ name: 'Pagos' })" />

      </div>
      <div class="right-actions hidden"> 
        <Button label="Añadir Nuevo Servicio" icon="pi pi-plus" class="add-service-button" @click="handleAddClient" />
      </div>
    </div>
    <input
      type="file"
      ref="fileInputRef"
      @change="handleImportFile"
      accept=".csv"
      style="display: none;"
    />

    <ServicesTable
      :services="serviceStore.services"
      :getServiceStatus="serviceStore.getServiceStatus"
      :userRole="serviceStore.userRole"
      :highlightedServiceId="serviceStore.highlightedServiceId"
      :formatPhoneNumber="serviceStore.formatPhoneNumber"
      @editService="handleEditClient"
      @deleteService="handleDeleteService"
      @showServiceInfo="serviceStore.showServiceInfoScreen"
      @renewService="handleRenewService"
      :showOwnerColumn="true"
      :allUserProfiles="allUserProfilesForTable"
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
      :style="{ maxHeight: '95vh' }"
      position="top"
      appendTo="body"
      class="client-form-dialog-wrapper"
    >
      <ClientForm
        v-if="serviceStore.userRole"
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
        :userRole="serviceStore.userRole as 'user' | 'admin'"
      />
    </Dialog>

    
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
    :userRole="serviceStore.userRole as 'user' | 'admin'"
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
        :userRole="serviceStore.userRole"
      />
      <template #footer>
        <Button label="Cerrar" icon="pi pi-times" @click="serviceStore.closeServiceInfoScreen" />
      </template>
    </Dialog>
     <StatsDialog :visible="showStatsDialog" @update:visible="showStatsDialog = $event" />

  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch, onUnmounted } from 'vue';
import { useServiceStore } from '@/stores/services';
import ServicesTable from '@/components/ServicesTable.vue';
import Button from 'primevue/button';
import SplitButton from 'primevue/splitbutton';
import Dialog from 'primevue/dialog';
import ClientForm from '@/components/ClientForm.vue';
import Toast from 'primevue/toast';
import { useToast } from 'primevue/usetoast';
import ServiceInfoScreen from '@/components/ServiceInfoScreen.vue'; 
import type { NewServiceInput, Service } from '@/types/Service';
import type { Store } from 'pinia';
import { useConfirm } from 'primevue/useconfirm';
import StatsDialog from '@/components/StatsDialog.vue';
import RenewalForm from '@/components/RenewalForm.vue';
import { useRouter } from 'vue-router';

// CAMBIO CLAVE: Tipado explícito para serviceStore
const serviceStore: ReturnType<typeof useServiceStore> = useServiceStore();
const confirm = useConfirm();
const toast = useToast();
const router = useRouter();
const fileInputRef = ref<HTMLInputElement | null>(null);
const showStatsDialog = ref(false);
const handleImportFile = async (event: Event) => {
  const target = event.target as HTMLInputElement;
  if (target.files && target.files.length > 0) {
    const file = target.files[0];
    await serviceStore.importServices(file);
    target.value = '';
  }
};

const isClientFormDialogVisible = computed({
  get: () => serviceStore.isAddingClient,
  set: (val) => serviceStore.setClientFormActive(val),
});

const isConfirmDeleteDialogVisible = ref(false);
const serviceToDeleteId = ref<number | null>(null);
const allUserProfilesForTable = computed(() => {
  return serviceStore.allUserProfiles || [];
});
const serviceToRenew = ref<Service | null>(null);
const isRenewalDialogVisible = ref(false);

onMounted(async () => {
  await serviceStore.fetchUser();
  serviceStore.fetchServices();
});

watch([isClientFormDialogVisible, () => serviceStore.isShowingServiceInfo, isRenewalDialogVisible],
 ([isAdding, isShowingInfo, isRenewing]) => {
  if (isAdding || isShowingInfo || isRenewing) {
    document.body.classList.add('no-scroll-body');
  } else {
    document.body.classList.remove('no-scroll-body');
  }
});

// Limpieza al desmontar el componente
onUnmounted(() => {
  document.body.classList.remove('no-scroll-body');
});
const importExportItems = computed(() => [
  {
    label: 'Importar',
    icon: 'pi pi-upload',
    command: () => {
      fileInputRef.value?.click();
    },
    disabled: serviceStore.isImporting || serviceStore.isExporting
  },

  {
    label: 'Exportar',
    icon: 'pi pi-download',
    command: async () => {
      await serviceStore.exportServices();
    },
    disabled: serviceStore.isImporting || serviceStore.isExporting 
  }
 ]);

const handleViewStats = () => {
 showStatsDialog.value = true; 
};

const handleAddClient = () => {
  serviceStore.resetNewServiceFormData();
  serviceStore.setClientFormActive(true);
};

const handleEditClient = (serviceId: number) => {
  const serviceToEdit = serviceStore.services.find(s => s.id === serviceId);
  if (serviceToEdit) {
    serviceStore.handleEditService(serviceToEdit);
  } else {
    console.error(`DashboardAdmin: No se encontró el servicio con ID ${serviceId} para editar.`);
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

    const newRenewalCounter = (serviceToRenew.value.renewal_counter || 0) + 1;
    updatedService.renewal_counter = newRenewalCounter;

    const success = await serviceStore.updateService(updatedService);

    if (success) {
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

/* Estilos para el Dialog que contiene el ClientForm */
.client-form-dialog-wrapper :deep(.p-dialog) {
  display: flex;
  flex-direction: column;
  height: 100%; 
  max-height: 98vh; 
  width: 95vw; 
}

.client-form-dialog-wrapper :deep(.p-dialog-header),
.client-form-dialog-wrapper :deep(.p-dialog-footer) {
  flex-shrink: 0; 
}

.client-form-dialog-wrapper :deep(.p-dialog-content) {
  flex-grow: 1; 
  padding: 0 !important; 
}
.left-actions {
  display: flex;
  gap: 1rem; /* Añade un espacio entre los botones */
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
 

  .client-form-dialog-wrapper :deep(.p-dialog) {
    width: 98vw !important; 
    max-height: 98vh !important; 
    margin: 0.5rem auto !important; 
  }
  .client-form-dialog-wrapper :deep(.p-dialog-header),
  .client-form-dialog-wrapper :deep(.p-dialog-content),
  .client-form-dialog-wrapper :deep(.p-dialog-footer) {
    padding: 1rem; 
  }
} 

@media (max-width: 575px) {
  .client-form-dialog-wrapper :deep(.p-dialog) {
    width: 98vw !important; 
    margin: 0.5rem !important; 
  }
}
</style>