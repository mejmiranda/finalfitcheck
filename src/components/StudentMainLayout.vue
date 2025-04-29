<template>
    <div style="display: flex; min-height: 100vh; ">
      <div class="vertical-nav">
        <div style="display: flex; justify-content: center; padding: 20px; margin-bottom: 50px; margin-top: 15px;">
          <img src="@/assets/logo.png" alt="Logo" style="max-height: 35px; margin-right: 5px;" />
        </div>
        <router-link to="/studentprofile" :class="{ active: $route.path.startsWith('/studentprofile') }">
          <img src="@/assets/profileicon.png" alt="Profile Icon" class="icon" />
          Profile
        </router-link>
        <router-link to="/studentdash" :class="{ active: $route.path === '/studentdash' }">
          <img src="@/assets/dashboardicon.png" alt="Dashboard Icon" class="icon" />
          Dashboard
        </router-link>
        <button @click="handleLogout" class="logout-button" style="margin-top: 20px;">
          <img src="@/assets/logout.png" alt="Logout Icon" class="icon" />
          Logout
        </button>
      </div>
      <div class="page-content">
        <router-view />
      </div>
    </div>
  </template>
  
  <script setup>
  import { useRouter } from 'vue-router';
  
  const router = useRouter();
  
  const handleLogout = () => {
    localStorage.removeItem('authToken');
    router.push('/login');
  };
  </script>
  
  <style scoped>
  /* Your existing styles */
  .vertical-nav {
    width: 200px;
    background-color: #ffffff;
    display: flex;
    flex-direction: column;
    flex-shrink: 0; /* Prevent the navigation from shrinking */
    min-height: 100vh;
    position: fixed;
    top: 0;
    left: 0;
    z-index: 10;
    box-shadow: 2px 0 5px rgba(0, 0, 0, 0.1);
  }
  
  .vertical-nav a {
    padding: 20px 15px;
    text-decoration: none;
    color: black;
    border-bottom: none solid #ffffff;
    display: flex;
    align-items: center;
    font-size: 12px;
  }
  
  .vertical-nav a:last-child {
    border-bottom: none;
  }
  
  .vertical-nav a.router-link-active {
    background-color: #ffffff;
  }
  
  .vertical-nav a.active {
    background-color: #FFC500;
    font-weight: bold;
  
  }
  
  .icon {
    max-height: 16px;
    margin-right: 8px;
  }
  
  .logout-button {
    /* Your existing logout button styles */
    padding: 10px 15px;
    background-color: white;
    color: black;
    border: none;
    cursor: pointer;
    text-align: left;
    font-size: 12px;
    display: flex;
    align-items: center;
    text-decoration: none;
  }
  
  .logout-button:hover {
    background-color: white;
  }
  
  .page-content {
    flex-grow: 1; /* This is the crucial part for taking up remaining width */
    padding: 20px; /* Or your preferred padding */
    padding-left: 220px; /* Adjust this to match your vertical navigation width */
  }
  </style>