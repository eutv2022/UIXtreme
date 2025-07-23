<template>
   <aside
    :class="['app-sidebar', { 'collapsed': serviceStore.isSidebarCollapsed }]"
    ref="sidebarRef"
    
  >
    <!-- Contenido de la sidebar (visible cuando no está colapsada) -->
    <h3 v-if="!serviceStore.isSidebarCollapsed">Próximos Servicios por Vencer</h3>
    <div v-if="!serviceStore.isSidebarCollapsed" class="sidebar-separator"></div>
    <ul v-if="!serviceStore.isSidebarCollapsed" class="upcoming-services-list">
      <template v-if="serviceStore.getUpcomingServices && serviceStore.getUpcomingServices.length > 0">
        <li v-for="service in serviceStore.getUpcomingServices"
            :key="service.id"
            @click.stop="service.id !== undefined && handleClickService(service.id)"
            class="expiring-service-item">
          {{ service.name }} ({{ serviceStore.getServiceStatus(service).daysRemaining }} días)
        </li>
      </template>

      <template v-else>
        <li @click.stop>No hay servicios próximos a vencer.</li>
      </template>
    </ul>

   </aside>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { useServiceStore } from '@/stores/services'; 
import { useRouter } from 'vue-router'; 

// Accede al store
const serviceStore = useServiceStore();
const router = useRouter(); 

const sidebarRef = ref<HTMLElement | null>(null);

//Variable para temporizador de inactividad
let inactivityTimer: ReturnType<typeof setTimeout> | null = null;
const INACTIVITY_TIMEOUT_MS = 30 * 1000; 

const startInactivityTimer = () => {
  clearInactivityTimer();
  if (!serviceStore.isSidebarCollapsed && window.innerWidth > 768) {
    inactivityTimer = setTimeout(() => {
      serviceStore.toggleSidebar();
    }, INACTIVITY_TIMEOUT_MS);
  }
};

const clearInactivityTimer = () => {
  if (inactivityTimer) {
    clearTimeout(inactivityTimer);
    inactivityTimer = null;
  }
};
// --- Manejadores de eventos ---
const handleSidebarSelfClick = (event: MouseEvent) => { 
  event.stopPropagation(); 
  if (window.innerWidth > 768) {
    serviceStore.toggleSidebar();
  }
  resetActivity();
};

const handleClickService = (serviceId: number | undefined) => {
  resetActivity();
  if (serviceId === undefined) {
    return;
  }
  if (window.innerWidth <= 768 && !serviceStore.isSidebarCollapsed) {
    serviceStore.toggleSidebar();
  }

  if (router.currentRoute.value.path !== '/dashboard/user' && router.currentRoute.value.path !== '/dashboard/admin') {
    router.push({ path: '/dashboard/user' }).then(() => {
      setTimeout(() => {
        serviceStore.scrollToServiceAndHighlight(serviceId);
      }, 200);
    });
  } else {
    serviceStore.scrollToServiceAndHighlight(serviceId);
  }
};
// Reinicia el temporizador de inactividad
const resetActivity = () => {
  clearInactivityTimer();
  startInactivityTimer();
};


// Maneja el clic en cualquier parte del documento
const handleDocumentClick = (event: MouseEvent) => {
  const headerButton = document.querySelector('.sidebar-toggle-button'); // Obtener el botón del header
  if (window.innerWidth <= 768 && !serviceStore.isSidebarCollapsed) {
    if (sidebarRef.value && !sidebarRef.value.contains(event.target as Node) &&
        (!headerButton || !headerButton.contains(event.target as Node))) { // Añadir esta condición
      serviceStore.toggleSidebar(); // Cerrar sidebar
    }
  }
};

// --- Ciclo de vida y watchers ---

onMounted(() => {
  document.addEventListener('click', handleDocumentClick);
  if (sidebarRef.value) {
    sidebarRef.value.addEventListener('click', handleSidebarSelfClick);
  }
  startInactivityTimer();
});

onUnmounted(() => {
  document.removeEventListener('click', handleDocumentClick);
  if (sidebarRef.value) {
    sidebarRef.value.removeEventListener('click', handleSidebarSelfClick);
  }
  clearInactivityTimer();
});

watch(() => serviceStore.isSidebarCollapsed, (isCollapsed) => {
  if (isCollapsed) {
    clearInactivityTimer();
  } else {
    startInactivityTimer();
  }
});

watch(() => router.currentRoute.value.path, (newPath) => {
  if (newPath.startsWith('/dashboard/') && !serviceStore.isSidebarCollapsed) {
  }
});

</script>
<style scoped>
.app-sidebar {
  height: 100vh; 
  background-color: var(--surface-card);
  border-right: 1px solid var(--surface-border);
  box-shadow: 2px 0 4px rgba(0,0,0,0.05); 
  display: flex;
  flex-direction: column;
  transition: width 0.3s ease, background-color 0.2s ease;
  flex-shrink: 0; 
  justify-content: flex-start;
  cursor: pointer;
  z-index: 1; 
  width: 250px; 
  padding: 6px; 
  overflow: visible; 
}

.app-sidebar.collapsed {
  width: 70px; 
  overflow: hidden; 
  padding: 0; 
}

.collapsed-icon-container {
  display: none;
}

/* Estilos para el título h3 */
.app-sidebar h3 {
  margin-top: 50px;
  margin-bottom: 20px;
  color: var(--text-color);
  font-size: 1.25rem;
  font-weight: 700;
}

/* Estilos para el separador visual */
.sidebar-separator {
  width: 100%;
  height: 2px;
  background-color: var(--cyan-700);
  margin: 0px 0 20px 0;
  opacity: 0.7;
}

/* Estilos para la lista de servicios */
.upcoming-services-list {
  list-style: none;
  padding: 0;
  margin-top: 10px;
  width: 100%;
}

/* Estilos para cada ítem de servicio */
.expiring-service-item {
  padding: 12px 10px;
  margin-bottom: 10px;
  background-color: var(--surface-c);
  border-radius: var(--border-radius);
  cursor: pointer;
  transition: background-color 0.2s;
  color: var(--text-color);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 0.95rem;
}
.expiring-service-item:hover {
  background-color: var(--surface-d);
}

/* Estilos para el cursor y hover en estado colapsado (aplican al área de la sidebar) */
.app-sidebar.collapsed {
  cursor: pointer;
}
.app-sidebar.collapsed:hover {
  background-color: var(--surface-d);
}

@media (max-width: 768px) {
  .app-sidebar {
    position: relative; 
    top: unset;
    left: unset;
    width: 100%; 
    z-index: 1; 
    border-right: none;
    border-bottom: 1px solid var(--surface-border);
    box-shadow: 0 2px 4px rgba(0,0,0,0.05); 
    transition: height 0.3s ease, padding 0.3s ease; 
    height: auto; 
    padding: 1rem; 
  }

  .app-sidebar.collapsed {
    height: 0;
    padding: 0;
  }
}
</style>