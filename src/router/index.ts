// src/router/index.ts

import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';
import { supabase } from '../supabase'; 


import Login from '../views/Login.vue';
import DashboardUser from '../views/DashboardUser.vue';
import DashboardAdmin from '../views/DashboardAdmin.vue';
import Clientes from '../views/Clientes.vue';
import Pagos from '@/views/Pagos.vue';


import AppLayout from '@/layouts/AppLayout.vue'; 

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    redirect: 'login',

  },
  {
    path: '/login',
    name: 'login',
    component: Login
  },

  {
    path: '/dashboard', 
    component: AppLayout, 
    meta: { requiresAuth: true }, 

    children: [ 
      {
        path: 'user', 
        name: 'dashboardUser', 
        component: DashboardUser,
        meta: { requiresAuth: true, roles: ['user', 'admin'] }
      },
      {
        path: 'admin', 
        name: 'dashboardAdmin', 
        component: DashboardAdmin,
        meta: { requiresAuth: true, roles: ['admin'] } 
      },
      {
        path: 'clientes', 
        name: 'clientes', 
        component: Clientes,
        meta: { requiresAuth: true, roles: ['user', 'admin'] } 
      },
      {
        path: '/pagos',
        name: 'Pagos',
        component: Pagos
      },
      {
        path: '', 
        redirect: { name: 'dashboardUser' } 
      }
    ]
  },
  
  {
    path: '/:pathMatch(.*)*',
    name: 'notFound',
    component: { template: '<div>404 - Página No Encontrada</div>' }
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

// Lógica de autenticación beforeEach (descomentada y ajustada)
router.beforeEach(async (to, from, next) => {
  const { data: { session } } = await supabase.auth.getSession();
  const requiresAuth = to.matched.some(record => record.meta.requiresAuth);
  const requiredRoles = to.meta.roles as string[] | undefined;

  if (requiresAuth && !session) {
  
    next('/login');
  } 
  
  else if (session && to.name === 'login') {
   
    next('/dashboard/user');
  }
  else if (requiresAuth && session && requiredRoles) {

    next();
  } else {
    
    next();
  }
});

export default router;