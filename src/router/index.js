import { createRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import ConversationView from '@/views/ConversationView.vue'
import LoginView from '@/views/LoginView.vue'
import MainLayout from '@/views/MainLayout.vue'
import WelcomeView from '@/views/WelcomeView.vue'

const routes = [
  { path: '/login', name: 'login', component: LoginView },
  {
    path: '/',
    component: MainLayout,
    meta: { requiresAuth: true },
    children: [
      { path: '', name: 'home', component: WelcomeView },
      { path: 'c/:conversationId', name: 'conversation', component: ConversationView, props: true },
    ],
  },
  { path: '/:pathMatch(.*)*', redirect: '/' },
]

export function createAppRouter(history) {
  const router = createRouter({ history, routes })

  router.beforeEach(async (to) => {
    const auth = useAuthStore()
    await auth.init()

    if (to.meta.requiresAuth && !auth.user) {
      return { name: 'login', query: to.fullPath === '/' ? {} : { redirect: to.fullPath } }
    }
    if (to.name === 'login' && auth.user) {
      return { name: 'home' }
    }
  })

  return router
}
