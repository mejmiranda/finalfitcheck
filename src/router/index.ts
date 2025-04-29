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
import SettleViolation from '@/views/SettleViolation.vue';

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
    path: '/settle-violation/:violationId', // Add the :violationId parameter
    name: 'SettleViolation',
    component: SettleViolation,
  },
  {
    path: '/studentdash',
    component: StudentMainLayout,
    meta: { requiresAuth: true },
    children: [
      {
        path: '/studentdash',
        name: 'StudentDashboard',
        component: StudentDashboard
      },
      {
        path: '/studentprofile',
        name: 'StudentProfile',
        component: StudentProfile
      },
    ],
  },
  {
    path: '/dashboard',
    component: MainLayout,
    meta: { requiresAuth: true, requiresAdmin: true },
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
  },
];

const router = createRouter({
  history: createWebHashHistory(process.env.BASE_URL),
  routes,
});

router.beforeEach((to, from, next) => {
  const authToken = localStorage.getItem('authToken');
  const userRole = localStorage.getItem('userRole');

  if (to.meta.requiresAuth && !authToken) {
    next('/login');
  } else if (authToken && to.path === '/login') {
    if (userRole === 'student') {
      next('/studentdash');
    } else if (userRole === 'admin') {
      next('/dashboard');
    } else {
      next('/'); // Fallback
    }
  } else if (to.meta.requiresAdmin && userRole !== 'admin') {
    console.warn('Admin access required.');
    next('/studentdash'); // Redirect non-admins trying to access admin routes
  } else {
    next();
  }
});

export default router;