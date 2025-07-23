<template>
  <div>
    <h1>Bienvenido a la Página de Inicio</h1>
    <p>Esta es la página principal de tu aplicación CRM.</p>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'Home',
});
</script>

<style scoped>
/* Estilos básicos si los necesitas */
div {
  padding: 20px;
  text-align: center;
}
h1 {
  color: #2c3e50;
}
</style>