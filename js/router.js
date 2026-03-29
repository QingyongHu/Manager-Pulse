import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  { path: '/', name: 'home', component: () => import('./components/HomeView.js').then(m => m.HomeView) },
  { path: '/role/:roleId', name: 'role', component: () => import('./components/RoleView.js').then(m => m.RoleView), props: true },
  { path: '/archive', name: 'archive', component: () => import('./components/ArchiveView.js').then(m => m.ArchiveView) },
  { path: '/report', name: 'report', component: () => import('./components/AnnualReportView.js').then(m => m.AnnualReportView) },
  { path: '/settings', name: 'settings', component: () => import('./components/SettingsView.js').then(m => m.SettingsView) },
]

export const router = createRouter({
  history: createWebHashHistory(),
  routes,
})
