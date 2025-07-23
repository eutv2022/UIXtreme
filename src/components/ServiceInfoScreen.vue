<template>
  <div class="service-info-screen-container">
    <div class="header-section">
      <h2 class="title">{{ service.name }} - Información</h2>
      <Button icon="pi pi-times" class="p-button-rounded p-button-text p-button-plain close-button" @click="$emit('close')" />
    </div>

    <TabView>
      <TabPanel header="Notas">
        <div class="p-fluid notes-section">
          <label for="serviceNote">Notas del Servicio:</label>
          <Textarea
            id="serviceNote"
            v-model="internalNote"
            rows="10"
            cols="30"
            autoResize
            class="w-full mb-3"
          />
          <Button label="Guardar Nota" icon="pi pi-save" class="p-button-primary" @click="saveNote" />

          <Divider align="center" class="mt-5">
            <span class="p-tag">Imágenes del Servicio</span>
          </Divider>

          <!-- Carrusel de imágenes en la pestaña de Notas (solo descargar) -->
          <div v-if="uploadedImages && uploadedImages.length > 0" class="image-carousel-wrapper">
            <Carousel
              :value="uploadedImages"
              :numVisible="3"
              :numScroll="1"
              :responsiveOptions="carouselResponsiveOptions"
              :circular="true"
              :showIndicators="false"
            >
              <template #item="slotProps">
                <div class="carousel-item-content">
                  <div class="image-thumbnail-carousel" @click="openImageDialog(slotProps.data, false)">
                    <img :src="slotProps.data.image_url" :alt="`Imagen ${slotProps.index + 1}`" />
                  </div>
                </div>
              </template>
            </Carousel>
          </div>
          <div v-else class="no-images-placeholder mt-3">
            <p>No hay imágenes cargadas para este servicio.</p>
          </div>
        </div>
      </TabPanel>

      <TabPanel header="Fotos">
        <div class="photos-section">
          <div class="upload-section">
            <FileUpload
              name="demo[]"
              :multiple="true"
              accept="image/*"
              :maxFileSize="5000000"
              @select="onFileSelect"
              @clear="onFileClear"
              :fileLimit="5"
              :auto="false"
              :showUploadButton="false"
              :showCancelButton="false"
              class="w-full"
            >
              <template #empty>
                <p>Arrastra y suelta imágenes aquí para subirlas.</p>
              </template>
            </FileUpload>
            <div class="p-fileupload-buttons mt-3 flex justify-content-end">
              <Button label="Subir Seleccionadas" icon="pi pi-upload" class="p-button-success mr-2" @click="uploadSelectedFiles" :disabled="!selectedFiles.length" />
              <Button label="Limpiar" icon="pi pi-times" class="p-button-secondary" @click="clearSelectedFiles" :disabled="!selectedFiles.length" />
            </div>
          </div>

          <Divider align="center">
            <span class="p-tag">Imágenes del Servicio</span>
          </Divider>

          <div v-if="uploadedImages && uploadedImages.length > 0" class="image-carousel-wrapper">
            <Carousel
              :value="uploadedImages"
              :numVisible="3"
              :numScroll="1"
              :responsiveOptions="carouselResponsiveOptions"
              :circular="true"
              :showIndicators="false"
            >
              <template #item="slotProps">
                <div class="carousel-item-content">
                  <div class="image-thumbnail-carousel" @click="openImageDialog(slotProps.data, true)">
                    <img :src="slotProps.data.image_url" :alt="`Imagen ${slotProps.index + 1}`" />
                  </div>
                </div>
              </template>
            </Carousel>
          </div>
          <div v-else class="no-images-placeholder">
            <p>No hay imágenes cargadas para este servicio.</p>
          </div>
        </div>
      </TabPanel>
    </TabView>

    <!-- Dialog para mostrar la imagen expandida -->
    <Dialog
      v-model:visible="isImageDialogVisible"
      :header="service.name + ' - Imagen'"
      :modal="true"
      :style="{ width: '80vw', 'max-width': '900px' }"
      :contentStyle="{ 'max-height': '70vh', overflow: 'auto' }"
      :draggable="false"
      :resizable="false"
    >
      <div class="expanded-image-container">
        <img :src="currentExpandedImage" :alt="service.name" class="expanded-image" />
      </div>

      <template #footer>
        <div class="dialog-footer-buttons">
          <Button
            icon="pi pi-download"
            label="Descargar"
            class="p-button-primary"
            @click="downloadImage(currentExpandedImage)"
          />
          <Button
            v-if="isDeleteButtonVisible && currentExpandedImageServiceImageObject"
            icon="pi pi-trash"
            label="Eliminar"
            class="p-button-danger ml-2"
            @click="confirmDeleteImage(currentExpandedImageServiceImageObject)"
          />
        </div>
      </template>
    </Dialog>

    <ConfirmDialog group="deleteImageConfirmation" />
    <Toast />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import type { Service, ServiceImage } from '@/types/Service';
import { useToast } from 'primevue/usetoast';
import { useConfirm } from 'primevue/useconfirm';

// PrimeVue Components
import Button from 'primevue/button';
import TabView from 'primevue/tabview';
import TabPanel from 'primevue/tabpanel';
import Textarea from 'primevue/textarea';
import FileUpload from 'primevue/fileupload';
import Carousel from 'primevue/carousel'; 
import Dialog from 'primevue/dialog';  
import Divider from 'primevue/divider';
import ConfirmDialog from 'primevue/confirmdialog';
import Toast from 'primevue/toast';

interface Props {
  service: Service;
  initialDeviceCounts: () => { [key: string]: number };
  parseDeviceArrayToCounts: (deviceArray: string[] | null) => { [key: string]: number };
  formatDeviceCountsToArray: (deviceCounts: { [key: string]: number } | undefined) => string[];
  uploadServiceImage: (serviceId: number, file: File) => Promise<ServiceImage | null>;
  deleteServiceImage: (imageId: number, filePath: string) => Promise<boolean>;
  updateServiceNote: (serviceId: number, newNote: string | null) => Promise<boolean>;
}

const props = defineProps<Props>();
const emits = defineEmits(['close']);

const toast = useToast();
const confirm = useConfirm();

const internalNote = ref<string | null>(props.service.note || null);

const selectedFiles = ref<File[]>([]);
const uploadedImages = ref<ServiceImage[]>(props.service.images || []);

// Nuevas variables de estado para el Dialog de imagen expandida
const isImageDialogVisible = ref(false);
const currentExpandedImage = ref('');
const currentExpandedImageServiceImageObject = ref<ServiceImage | null>(null);
const isDeleteButtonVisible = ref(false); 

// Opciones para el Carousel
const carouselResponsiveOptions = ref([
  { breakpoint: '1024px', numVisible: 3, numScroll: 3 },
  { breakpoint: '768px', numVisible: 2, numScroll: 2 },
  { breakpoint: '576px', numVisible: 1, numScroll: 1 }
]);

watch(() => props.service.note, (newNote) => {
  internalNote.value = newNote || null;
});

watch(() => props.service.images, (newImages) => {
  console.log("ServiceInfoScreen: Watcher - props.service.images cambió:", newImages);
  uploadedImages.value = newImages || [];
}, { deep: true });

onMounted(() => {
  console.log("ServiceInfoScreen: onMounted - Servicio inicial:", props.service);
  console.log("ServiceInfoScreen: onMounted - Imágenes iniciales cargadas:", uploadedImages.value);
});

const saveNote = async () => {
  if (props.service.id) {
    const success = await props.updateServiceNote(props.service.id, internalNote.value);
    if (success) {
      toast.add({ severity: 'success', summary: 'Nota Guardada', detail: 'La nota ha sido actualizada.', life: 3000 });
    }
  } else {
    toast.add({ severity: 'error', summary: 'Error', detail: 'No se puede guardar la nota sin un ID de servicio.', life: 3000 });
  }
};

const onFileSelect = (event: { files: unknown[] }) => {
  selectedFiles.value = event.files as File[];
  toast.add({ severity: 'info', summary: 'Archivos Seleccionados', detail: `${event.files.length} archivo(s) listo(s) para subir.`, life: 3000 });
};

const onFileClear = () => {
  selectedFiles.value = [];
};

const clearSelectedFiles = () => {
  selectedFiles.value = [];
  toast.add({ severity: 'info', summary: 'Archivos Limpiados', detail: 'Selección de archivos borrada.', life: 3000 });
};

const uploadSelectedFiles = async () => {
  if (!props.service.id) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'No se puede subir imágenes sin un ID de servicio.', life: 3000 });
    return;
  }
  if (selectedFiles.value.length === 0) {
    toast.add({ severity: 'warn', summary: 'Advertencia', detail: 'No hay archivos seleccionados para subir.', life: 3000 });
    return;
  }

  const uploadPromises = selectedFiles.value.map(file =>
    props.uploadServiceImage(props.service.id!, file)
  );

  const results = await Promise.all(uploadPromises);
  const successfulUploads = results.filter(result => result !== null) as ServiceImage[];

  if (successfulUploads.length > 0) {
    uploadedImages.value = [...uploadedImages.value, ...successfulUploads];
    clearSelectedFiles();
    toast.add({ severity: 'success', summary: 'Subida Completa', detail: `${successfulUploads.length} imagen(es) subida(s) con éxito.`, life: 3000 });
  } else {
    toast.add({ severity: 'error', summary: 'Error de Subida', detail: 'No se pudo subir ninguna imagen.', life: 3000 });
  }
};

// Función para abrir el Dialog de imagen expandida
const openImageDialog = (image: ServiceImage, showDelete: boolean) => {
  currentExpandedImage.value = image.image_url;
  currentExpandedImageServiceImageObject.value = image;
  isDeleteButtonVisible.value = showDelete;
  isImageDialogVisible.value = true;
};

const downloadImage = (imageUrl: string) => {
  const link = document.createElement('a');
  link.href = imageUrl;
  link.download = imageUrl.substring(imageUrl.lastIndexOf('/') + 1);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  toast.add({ severity: 'info', summary: 'Descarga Iniciada', detail: 'La imagen se está descargando.', life: 3000 });
};

const confirmDeleteImage = (imageToDelete: ServiceImage) => {
  confirm.require({
    group: 'deleteImageConfirmation',
    message: '¿Estás seguro de que quieres eliminar esta imagen?',
    header: 'Confirmar Eliminación',
    icon: 'pi pi-exclamation-triangle',
    acceptClass: 'p-button-danger',
    accept: async () => {
      if (imageToDelete.id && imageToDelete.file_path) {
        const success = await props.deleteServiceImage(imageToDelete.id, imageToDelete.file_path);
        if (success) {
          uploadedImages.value = uploadedImages.value.filter(img => img.id !== imageToDelete.id);
          isImageDialogVisible.value = false; 
          toast.add({ severity: 'success', summary: 'Eliminada', detail: 'Imagen eliminada correctamente.', life: 3000 });
        }
      } else {
        toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudo eliminar la imagen (ID o ruta no disponibles).', life: 3000 });
      }
    },
    reject: () => {
      toast.add({ severity: 'info', summary: 'Cancelado', detail: 'Eliminación de imagen cancelada.', life: 3000 });
    }
  });
};
</script>

<style scoped>
.service-info-screen-container {
  background-color: var(--surface-card);
  padding: 2rem;
  border-radius: var(--border-radius);
  box-shadow: var(--surface-shadow);
  max-width: 900px;
  margin: 1.5rem auto;
  position: relative;
}

.header-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--surface-border);
}

.header-section .title {
  margin: 0;
  color: var(--text-color);
  font-size: 1.8rem;
  font-weight: bold;
}

.close-button {
  font-size: 1.5rem;
  color: var(--text-color-secondary);
}

.notes-section, .photos-section {
  padding: 1rem;
}

.upload-section {
  margin-bottom: 1.5rem;
  border: 1px dashed var(--surface-border);
  padding: 1rem;
  border-radius: var(--border-radius);
}

/* Estilos para el carrusel de imágenes */
.image-carousel-wrapper {
  margin-top: 1rem;
  padding: 1rem;
  border: 1px solid var(--surface-border);
  border-radius: var(--border-radius);
  background-color: var(--surface-ground);
}

.carousel-item-content {
  padding: 0.5rem;
  text-align: center;
}

.image-thumbnail-carousel {
  border: 1px solid var(--surface-border);
  border-radius: var(--border-radius);
  overflow: hidden;
  cursor: pointer;
  width: 100%;
  padding-top: 75%; 
  position: relative;
  box-shadow: var(--surface-shadow);
  transition: transform 0.2s ease-in-out;
}

.image-thumbnail-carousel:hover {
  transform: scale(1.05);
}

.image-thumbnail-carousel img {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.no-images-placeholder {
  text-align: center;
  padding: 2rem;
  color: var(--text-color-secondary);
  font-style: italic;
}

/* Estilos para la imagen expandida en el Dialog */
.expanded-image-container {
  text-align: center;
  max-height: 60vh; 
  overflow: hidden;
}

.expanded-image {
  max-width: 100%;
  max-height: 100%;
  height: auto;
  display: block;
  margin: 0 auto;
}

.dialog-footer-buttons {
  display: flex;
  justify-content: center;
  padding-top: 1rem;
}

</style>