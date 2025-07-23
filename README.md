# Vue 3 + TypeScript + Vite

# Gestor de clientes con funcionalidades:
<Biometric @ apajarita> <Pinia> <Supabase> <charts> <Primevue> 

 **Distincion de Roles:**
  * Users con vista local
  * Admin con vista general
  * Funcionalidades especificas para cada uno. 
 --- :sparkles:
 **Visualizacion de tablas:**
   * ID unico para cada fila
   * numero de telefono auto-format
   * seleccion multiple de dispositivos
        - Seleccion mediante lista X cantidad de diferentes items (array)
   * columna de estado por colores
        - Rojo: Expired
        - Verde: Active
        - Amarillo: Por vencer 
            - Agrega contador de dias por vencer
   * Owner: dueño de cada fila
        - En <Admin Mode only> Distingue el dueño de la lista
 ---
 **Sidebar Auto plegable**
   * Llamada a proximos a vencer

 *Barra de busqueda en tiempo real* 
  * 'Sin Enter' 
 
 *Carga de fotos para cada servicio individualmente* 
  * A travez de <SplitButton> 
        * Info: 
                - Agrega notas
                - Carga Fotos
                - Y las visualiza a travez de PrimeVue+Typescript
                - Opciones de descargar y eliminar
 
 *Ventana de estadisticas generales o personales* 
  * Disponible desde Modo-Admin.

*<2> Dashboards: /admin /user*

*Styles globales, importados por themes/primevue y personalizados*

*Botones de @Primevue/ Primebuttons*

*Funcionalidad Importar/Exportar*

