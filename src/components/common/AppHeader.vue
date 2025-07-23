<template>
  <header class="app-header">
    <div class="header-left">
       <Button
        icon="pi pi-bars"
        class="p-button-text p-button-rounded sidebar-toggle-button"
        @click="handleToggleSidebarClick"
        
      />
      </div>

    <div class="header-center">
      <h2 class="app-title">Gestión de Clientes</h2>
    </div>

    <div class="header-right">
      <div class="user-info">
        <span>Bienvenido: {{ userDisplayName }}</span>
      </div>

      <Button @click="$emit('logout')" label="Cerrar Sesión" class="p-button-danger" />
    </div>
  </header>
</template>

<script setup lang="ts">
import Button from 'primevue/button'; 
import Sidebar from 'primevue/sidebar';

interface Props {
  userDisplayName: string;
  isAddingClient: boolean;
}
const props = defineProps<Props>();

interface AppHeaderEmits {
  (event: 'startAddClient'): void;
  (event: 'logout'): void;
  (event: 'toggleSidebar'): void; 
}

const emits = defineEmits<AppHeaderEmits>();

const handleToggleSidebarClick = () => {
 emits('toggleSidebar');
};
</script>

<style scoped>
.app-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background-color: var(--surface-b); 
  border-bottom: 1px solid var(--surface-border);
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
  flex-shrink:0;
  z-index: 1001;
}

.header-left, .header-right {
  display: flex;
  gap: 1rem;
  align-items: center;
}
.app-title {
  margin: 0;
  color: var(--primary-color);
}
.user-info span {
  font-weight: bold;
  color: var(--text-color);
}
.sidebar-toggle-button {
  display: none;
  margin-right: 0.5rem; 
}
/* --- MEDIA QUERIES --- */
@media (max-width: 768px) {
  .app-header {
    padding: 0.75rem 1rem;
    position: fixed; 
    width: 100%;
    left: 0;
    top: 0;
  }

  .app-title {
    font-size: 1.5rem; 
  }

  .user-info {
    display: none;
  }

  /* MOSTRAR EL BOTÓN DE HAMBURGUESA EN MÓVIL */
  .sidebar-toggle-button {
    display: inline-flex;
  }
}

@media (max-width: 480px) {
  .app-header {
    padding: 0.5rem 0.75rem;
  }
}
</style>