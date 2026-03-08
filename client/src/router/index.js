import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '../stores/user'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/Login.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/',
    component: () => import('../views/Layout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        name: 'Dashboard',
        component: () => import('../views/Dashboard.vue')
      },
      {
        path: 'houses',
        name: 'Houses',
        component: () => import('../views/Houses.vue')
      },
      {
        path: 'houses/:id',
        name: 'HouseDetail',
        component: () => import('../views/HouseDetail.vue')
      },
      {
        path: 'tenants',
        name: 'Tenants',
        component: () => import('../views/Tenants.vue')
      },
      {
        path: 'contracts',
        name: 'Contracts',
        component: () => import('../views/Contracts.vue')
      },
      {
        path: 'bills',
        name: 'Bills',
        component: () => import('../views/Bills.vue')
      },
      {
        path: 'meters',
        name: 'Meters',
        component: () => import('../views/Meters.vue')
      },
      {
        path: 'stats',
        name: 'Stats',
        component: () => import('../views/Stats.vue')
      }
    ]
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/'
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  const userStore = useUserStore()

  if (to.meta.requiresAuth && !userStore.token) {
    next('/login')
  } else if (to.path === '/login' && userStore.token) {
    next('/')
  } else {
    next()
  }
})

export default router