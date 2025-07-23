<!-- src/App.vue -->
<template>
  <router-view />
</template>

<script setup lang="ts">
import { RouterView } from 'vue-router';
</script>

<style>
/* Estilos globales para la aplicación */
html, body {
  height: 100%;
  margin: 0;
  padding: 0;
  font-family: var(--font-family);
  background-color: #1d242e; /* Fondo original de tu login */
  color: var(--text-color);
  min-width: 100%;
}

#app {
  height: 100%;
  min-width: 100%;
}


body.no-scroll-body {
  overflow: hidden !important;
  position: fixed !important;
  width: 100% !important;
  height: 100% !important;
}

</style>
