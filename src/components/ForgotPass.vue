<template>
    <div class="login-container">
      <div class="forgot-password-form">
        <div class="welcome-logo">
          <img src="@/assets/reset.png" alt="RESET YOUR PASSWORD">
        </div>
        <form @submit.prevent="resetPassword">
          <div class="form-group">
            <label for="email">TIP Email Address</label>
            <input type="email" id="email" v-model="email" required placeholder="Enter your email address">
          </div>
          <div class="form-group">
            <label for="password">Password</label>
            <input type="password" id="password" v-model="password" required placeholder="Enter your new password">
          </div>
          <div class="form-group">
            <label for="re-enter-password">Re-enter Password</label>
            <input type="password" id="re-enter-password" v-model="reEnterPassword" required placeholder="Re-enter your new password">
          </div>
          <div class="form-group confirm-password-checkbox">
            <input type="checkbox" id="confirm-password" v-model="confirmPassword">
            <label for="confirm-password">Confirm password</label>
          </div>
          <button type="submit" class="reset-button" :disabled="isSubmitting || !confirmPassword || password !== reEnterPassword">
            {{ isSubmitting ? 'Sending...' : 'Reset' }}
          </button>
          <p class="error-message" v-if="error">{{ error }}</p>
          <p class="success-message" v-if="success">{{ success }}</p>
        </form>
        <router-link to="/login" class="back-to-login">Return to Login</router-link>
      </div>
      <div class="login-image">
        <img src="@/assets/studentpic.png" alt="Students">
      </div>
    </div>
  </template>
  
  <script setup>
  import { ref, onMounted } from 'vue';
  import { useRouter } from 'vue-router';
  import axios from 'axios';
  
  const email = ref('');
  const password = ref('');
  const reEnterPassword = ref('');
  const confirmPassword = ref(false);
  const error = ref('');
  const success = ref('');
  const isSubmitting = ref(false);
  const router = useRouter();
  
  onMounted(() => {
    // You can add any initialization logic here
  });
  
  const resetPassword = async () => {
    isSubmitting.value = true;
    error.value = '';
    success.value = '';
  
    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) {
      error.value = "Invalid email address.";
      isSubmitting.value = false;
      return;
    }
  
    if (password == reEnterPassword) {
      error.value = "Passwords do not match.";
      isSubmitting.value = false;
      return;
    }
  
    if (!confirmPassword) {
      error.value = "Please confirm your password.";
      isSubmitting.value = false;
      return;
    }
  
    console.log('Resetting password for:', email.value);
  
    try {
      // Replace this with your actual API call
      // const response = await axios.post('/api/reset-password', { email: email.value, password: password.value });
      // if (response.data.success) {
      //   success.value = 'Password has been reset successfully.  You will be redirected to login.';
      //   setTimeout(() => {
      //     router.push('/login');
      //   }, 3000);
      // } else {
      //   error.value = response.data.message || 'Failed to reset password. Please try again.';
      // }
  
      // Simulate API call and success with redirection after 3 seconds
      await new Promise(resolve => setTimeout(resolve, 2000));
      success.value = 'Password has been reset successfully.  You will be redirected to login.';
      isSubmitting.value = false;
      setTimeout(() => {
        router.push('/login');
      }, 3000); // Redirect after 3 seconds
    } catch (err) {
      console.error('Error resetting password:', err);
      error.value = 'Failed to reset password. Please try again.';
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
  
  .forgot-password-form {
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
  
  input[type="email"],
  input[type="password"] {
    width: 185%;
    padding: 10px;
    border: 1px solid #ddd;
    border-radius: 15px;
    font-size: 1em;
    box-sizing: border-box;
    margin-bottom: 0;
  }
  
  input[type="email"]::placeholder,
  input[type="password"]::placeholder {
    color: #aaa;
    font-size: 0.9em;
  }
  
  
  .confirm-password-checkbox {
    display: flex;
    align-items: center;
    margin-top: 15px;
  }
  
  .confirm-password-checkbox input[type="checkbox"] {
    margin-right: 8px;
  }
  
  
  .reset-button {
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
  
  .reset-button:hover {
    background-color: #e0ac00;
  }
  
  .reset-button:disabled {
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
  
  .success-message {
    color: #28a745;
    margin-top: 15px;
    font-size: 0.9em;
    text-align: left;
  }
  
  .back-to-login {
    display: block;
    margin-top: 20px;
    color: #007bff;
    text-decoration: none;
    font-size: 0.9em;
    text-align: left;
    margin-left: 30%;
    width: 100%; /* Make it the same width as the button */
  }
  
  .back-to-login:hover {
    text-decoration: underline;
  }
  
  .login-image {
    flex: 1;
    display: flex;
    justify-content: flex-end;
    align-items: center;
    overflow: hidden;
    padding-left: 0; /* Removed padding-left: 20px; */
  }
  
  .login-image img {
    display: block;
    width: 100%;
    height: auto;
    object-fit: cover;
    min-height:130vh  /* 100vh - height of header and form elements*/
  }
  
  @media (max-width: 768px) {
    .login-container {
      flex-direction: column;
    }
  
    .forgot-password-form {
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
  
    input[type="email"],
    input[type="password"] {
      width: 100%;
    }
  
    .reset-button {
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
      max-height: auto;
      object-fit: cover;
    }
  }
  </style>
  