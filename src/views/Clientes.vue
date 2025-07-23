<template>
  <div>
    <h1>Bienvenido a la seccion de Clientes</h1>
    <p>Esta es la página de administracion de clientes.</p>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'Clientes', // <-- Name is 'Clientes'
});
</script>

<style scoped>
h1 {
  color: #2c3e50;
}
</style>