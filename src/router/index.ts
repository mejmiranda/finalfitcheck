import { createRouter, createWebHashHistory, RouteRecordRaw } from 'vue-router';
import LoginPage from '../components/LoginPage.vue'; // Login is in components
import ForgotPass from '@/components/ForgotPass.vue'; // Adjust the path if needed
import MainLayout from '@/components/MainLayout.vue';
import ActivityLogView from '@/views/ActivityLogView.vue';
import DashboardView from '@/views/DashboardView.vue';
import NotificationView from '@/views/NotificationView.vue';
import ProfileView from '@/views/ProfileView.vue';
import ReportsView from '@/views/ReportsView.vue';
import StudentDashboard from '@/views/StudentDashboard.vue';
import StudentMainLayout from '@/components/StudentMainLayout.vue';
import StudentProfile from '@/views/StudentProfile.vue';
import StudentActlog from '@/views/StudentActlog.vue';


const routes: Array<RouteRecordRaw> = [
  {
    path: '/login',
    name: 'Login',
    component: LoginPage,
  },
  {
    path: '/',
    redirect: '/login',
  },
  {
      path: '/forgot-password',
      name: 'ForgotPassword', // You can name it as you like
      component: ForgotPass,
  },
  {
    path: '/studentlogin',
    component: StudentMainLayout,
    children: [
      {       
        path: '/studentdash',
        name: 'StudentDashboard', // You can name it as you like
        component: StudentDashboard},
      {       
        path: '/studentprofile',
        name: 'StudentProfile', // You can name it as you like
        component: StudentProfile},
      {       
        path: '/studentactlog',
        name: 'StudentActlog', // You can name it as you like
        component: StudentActlog},
    ]
},
  {
    path: '/dashboard',
    component: MainLayout,
    children: [
      {
        path: '',
        name: 'Dashboard',
        component: DashboardView,
      },  
      {
        path: '/activity-log',
        name: 'ActivityLog',
        component: ActivityLogView,
      },  
      {
        path: '/notification',
        name: 'Notification',
        component: NotificationView,
      },
      {
        path: '/profile',
        name: 'Profile',
        component: ProfileView,
      },
      {
        path: '/reports',
        name: 'Reports',
        component: ReportsView,
      },
    ],
      meta: { requiresAuth: true },
    },
  ];

const router = createRouter({
  history: createWebHashHistory(process.env.BASE_URL),
  routes,
});
router.beforeEach((to, from, next) => {
  const isAuthenticated = localStorage.getItem('authToken');

  if (to.meta.requiresAuth && !isAuthenticated && to.path !== '/login') {
    next('/login');
  } else if (isAuthenticated && to.path === '/login') {
    next('/dashboard'); // Redirect logged-in users away from the login page
  } else {
    next();
  }
});

export default router;