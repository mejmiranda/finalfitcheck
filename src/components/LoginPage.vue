<template>
  <div class="login-container">
    <div class="login-form">
      <div class="welcome-logo">
        <img src="@/assets/welcome.png" alt="Welcome">
      </div>
      <form @submit.prevent="login">
        <div class="form-group">
          <label for="username">Username</label>
          <input type="text" id="username" v-model="username" required placeholder="Enter your username">
        </div>
        <div class="form-group">
          <label for="email">TIP Email Address</label>
          <input type="email" id="email" v-model="email" required placeholder="Enter your email address">
        </div>
        <div class="form-group">
          <label for="password">Password</label>
          <input type="password" id="password" v-model="password" required placeholder="Enter your password">
        </div>
        <button type="submit" class="login-button" :disabled="isSubmitting">
          {{ isSubmitting ? 'Logging in...' : 'Login' }}
        </button>
        <p class="error-message" v-if="error">{{ error }}</p>
      </form>
      <router-link to="/forgot-password" class="forgot-password">Forgot Password?</router-link>
    </div>
    <div class="login-image">
      <img src="@/assets/studentpic.png" alt="Students">
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import supabase from './Supabase.js';

const username = ref('');
const password = ref('');
const email = ref('');
const error = ref('');
const isSubmitting = ref(false);
const router = useRouter();

onMounted(() => {
  // Optional: Any initialization logic
});

const login = async () => {
  isSubmitting.value = true;
  error.value = '';

  try {
    // Try to find user in admins table
    const { data: adminData, error: adminError } = await supabase
      .from('admins')
      .select('id')
      .eq('username', username.value)
      .eq('email', email.value)
      .eq('password', password.value)
      .single();

    if (adminError) {
      console.error('Admin login error:', adminError.message || adminError);
      // Don't throw yet, try students table
    }

    if (adminData) {
      console.log('Admin Login Successful', adminData);
      localStorage.setItem('authToken', adminData.id);
      localStorage.setItem('userRole', 'admin');
      router.push('/dashboard');
      return;
    }

    // If not found in admins, try students table
    const { data: studentData, error: studentError } = await supabase
      .from('students')
      .select('id')
      .eq('username', username.value)
      .eq('email', email.value)
      .eq('password', password.value)
      .single();

    if (studentError) {
      console.error('Student login error:', studentError.message || studentError);
      throw studentError; // Throw error if student login also fails
    }

    if (studentData) {
      console.log('Student Login Successful', studentData);
      localStorage.setItem('authToken', studentData.id);
      localStorage.setItem('userRole', 'student');
      router.push('/studentdash');
      return;
    }

    // If not found in either table
    error.value = 'Invalid Credentials';

  } catch (err) {
    console.error('Login error:', err.message || err);
    error.value = 'Login failed. Please try again.';
  } finally {
    isSubmitting.value = false;
  }
};
</script>

<style scoped>
.login-container {
  display: flex;
  min-height: 100vh;
  background-color: #ffffff;
}

.login-form {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: flex-start;
  padding: 40px;
  text-align: left;
  max-width: 500px;
  width: 100%;
}

.welcome-logo {
  margin-bottom: 30px;
  width: 100%;
  display: flex;
  justify-content: flex-start;
}

.welcome-logo img {
  max-width: 400px;
  height: auto;
  display: block;
}

h1 {
  margin-bottom: 20px;
  color: #333;
  text-align: center;
  font-size: 1.5rem;
  font-weight: bold;
}

p {
  margin-bottom: 20px;
  color: #555;
  text-align: center;
}

.form-group {
  margin-bottom: 15px;
  width: 100%;
  text-align: left;
}

label {
  display: block;
  margin-bottom: 5px;
  color: #555;
  font-weight: bold;
  font-size: 0.9em;
}

input[type="text"],
input[type="password"],
input[type="email"] {
  width: 185%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 15px;
  font-size: 1em;
  box-sizing: border-box;
  margin-bottom: 0;
}

input[type="email"]::placeholder,
input[type="password"]::placeholder,
input[type="text"]::placeholder {
  color: #aaa;
  font-size: 0.9em;
}


.login-button {
  background-color: #FFC500;
  color: #333;
  border: none;
  padding: 12px 20px;
  border-radius: 15px;
  cursor: pointer;
  font-size: 1em;
  width: 185%;
  transition: background-color 0.3s ease;
  font-weight: bold;
  margin-top: 20px;
  text-align: center;
  margin-left: auto;
  margin-right: auto;
}

.login-button:hover {
  background-color: #e0ac00;
}

.login-button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
  opacity: 0.6;
}

.error-message {
  color: #dc3545;
  margin-top: 15px;
  font-size: 0.9em;
  text-align: left;
}

.forgot-password {
  display: block;
  margin-top: 20px;
  color: #007bff;
  text-decoration: none;
  font-size: 0.9em;
  text-align: left;
  margin-left: 30%;
  width: 100%;
}

.forgot-password:hover {
  text-decoration: underline;
}

.login-image {
  flex: 1;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  overflow: hidden;
  padding-left: 0;
}

.login-image img {
  display: block;
  width: 100%;
  height: auto;
  object-fit: cover;
  max-height: 100vh; /* Ensure image doesn't exceed viewport height */
}

@media (max-width: 768px) {
  .login-container {
    flex-direction: column;
  }

  .login-form {
    flex: none;
    width: 100%;
    padding: 30px;
    max-width: none;
  }

  .welcome-logo {
    justify-content: center;
  }

  .welcome-logo img {
    max-width: 80%;
  }

  h1 {
    font-size: 1.2rem;
  }

  p {
    font-size: 0.9rem;
  }


  .form-group {
    max-width: none;
  }

  input[type="text"],
  input[type="password"],
  input[type="email"] {
    width: 100%;
  }

  .login-button {
    width: 100%;
    max-width: none;
  }

  .error-message,
  .success-message {
    max-width: none;
  }

  .login-image {
    flex: none;
    width: 100%;
    height: auto;
    min-height: auto;
    padding-left: 0;
    justify-content: center;
  }

  .login-image img {
    max-width: 100%;
    max-height: 70%;
    object-fit: cover;
  }
}
</style>