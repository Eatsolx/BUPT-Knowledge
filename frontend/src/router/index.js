import { createRouter, createWebHistory } from 'vue-router'
import Home from '../components/Home.vue'
import ChatInterface from '../components/ChatInterface.vue'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home
  },
  {
    path: '/chat',
    name: 'Chat',
    component: ChatInterface,
    props: (route) => ({ 
      initialQuestion: route.query.question || null 
    })
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router 