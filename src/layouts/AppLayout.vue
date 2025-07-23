<template>
  <div class="app-layout">
    <AppHeader 
      :userDisplayName="serviceStore.userDisplayName"
      :isAddingClient="serviceStore.isAddingClient"
      @startAddClient="serviceStore.setClientFormActive(true)" 
      @logout="handleLogout"
       @toggleSidebar="serviceStore.toggleSidebar()" 
    /> 

    
    
    <div class="layout-main">
      <AppSidebar 
        :upcomingServices="serviceStore.getUpcomingServices"
        :isCollapsed="serviceStore.isSidebarCollapsed"
        :getServiceStatus="serviceStore.getServiceStatus"
        @scrollToServiceAndHighlight="scrollToServiceAndHighlight"
      />     
      <main class="layout-content" :class="{ 'sidebar-collapsed-margin': serviceStore.isSidebarCollapsed }">
        <RouterView /> 
      </main>
    </div>
    <footer class="app-footer">
      <p>&copy; 2025 JBrands</p>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { RouterView, useRouter } from 'vue-router';
import AppHeader from '@/components/common/AppHeader.vue'; 
import AppSidebar from '@/components/common/AppSidebar.vue';
import { useServiceStore } from '@/stores/services'; 
import { supabase } from '../supabase';

const serviceStore = useServiceStore();
const router = useRouter();

onMounted(() => {
  serviceStore.fetchUser();
});

const handleLogout = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw error;
    }
    router.push('/login');
  } catch (error: any) {
  }
};

const scrollToServiceAndHighlight = (id: number) => {
  serviceStore.toggleServiceTableView();
  serviceStore.setHighlightedService(id);
};

const handleToggleSidebarEvent = () => {
  serviceStore.toggleSidebar(); // Llama a la acción del store
};
</script>
<style scoped>
:root {
  --header-height-desktop: 79px; 
  --header-height-mobile: 65px;  
}

.app-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column; 
  width: 100%;
}

/* Contenedor principal para la sidebar y el contenido */
.layout-main {
  display: flex; 
  flex-grow: 1; 
  width: 100%;
}

/* Estilos para el contenido principal */
.layout-content {
  flex-grow: 1; 
  padding: 2rem;
  background-color: var(--surface-f);
  transition: margin-left 0.3s ease; 
  width: 100%; 
}

/* Margen del contenido cuando la sidebar está EXPANDIDA en desktop */
.sidebar-expanded-margin {
  margin-left: 250px; 
}

/* Margen del contenido cuando la sidebar está COLAPSADA en desktop */

.app-footer {
  background-color: var(--surface-a);
  padding: 0.5rem;
  text-align: center;
  color: var(--text-color-secondary);
  flex-shrink: 0;
}

@media (max-width: 768px) {
  .layout-main {
    margin-top: var(--header-height-mobile);
    flex-direction: column; 
  }

  .app-sidebar {
    position: relative; 
    top: unset;
    left: unset;
    width: 100%; 
    z-index: 1; 
  }

  .layout-content {
    margin-left: 0 !important; 
    padding: 1rem; 
  }
}

@media (max-width: 480px) {
  .layout-content {
    padding: 0.75rem;
  }
}
</style>