<template>
  <div class="settle-violation">
    <!-- Header and Instructions -->
    <div class="content-section">
      <h1 class="title">Violation Re-Orientation</h1>
      
      <div class="instructions">
        <p>
          In accordance with our dress code policy, you are required to complete a re-orientation by viewing the 
          instructional video provided below. To ensure proper compliance, the video must be watched in full—skipping or 
          interrupting the playback may result in the session not being recognized by the system.
        </p>
        <p>
          The system will automatically mark the violation as settled only after the video has been fully viewed without 
          interruption. Kindly complete this requirement within three (3) days to avoid the violation being recorded as a 
          liability in your portal.
        </p>
        <p class="thank-you">Thank you for your cooperation!</p>
      </div>
    </div>

    <!-- Countdown Timer -->
    <div v-if="showCountdown" class="countdown-section">
      <div class="countdown-container">
        <div class="countdown-circle">
          <span class="countdown-number">{{ countdown }}</span>
        </div>
        <p class="countdown-text">The re-orientation video will start in...</p>
      </div>
    </div>

    <!-- Video Section -->
    <div v-if="showVideo" class="video-section">
      <div class="video-container">
        <video
          ref="violationVideo"
          width="100%"
          height="100%"
          controls
          @ended="handleVideoEnded"
          @error="handleVideoError"
          autoplay
          controlsList="nodownload"
        >
          <source src="https://nnrppf22z9uq6hs7.public.blob.vercel-storage.com/video_violations.mp4" type="video/mp4" />
          Your browser does not support the video tag.
        </video>
        
        <div v-if="videoError" class="video-error">
          <p>{{ videoError }}</p>
          <button @click="retryVideo" class="retry-button">Retry Video</button>
        </div>
      </div>
    </div>

    <!-- Done Button -->
    <div v-if="showDoneButton" class="done-section">
      <button 
        @click="markViolationAsDone" 
        :disabled="isSubmitting"
        class="done-button"
      >
        {{ isSubmitting ? 'Processing...' : 'Done' }}
      </button>
      <p class="completion-text">Video completed successfully! Click "Done" to settle your violation.</p>
    </div>

    <!-- Loading/Success Messages -->
    <div v-if="successMessage" class="success-message">
      {{ successMessage }}
    </div>
    
    <div v-if="errorMessage" class="error-message">
      {{ errorMessage }}
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useRouter, useRoute } from 'vue-router'
// Import your Supabase client
// import supabase from '@/components/Supabase'

const router = useRouter()
const route = useRoute()

// Reactive variables
const countdown = ref(5)
const showCountdown = ref(true)
const showVideo = ref(false)
const showDoneButton = ref(false)
const videoError = ref(null)
const isSubmitting = ref(false)
const successMessage = ref('')
const errorMessage = ref('')
const violationVideo = ref(null)

let countdownInterval = null

// Start countdown when component mounts
onMounted(() => {
  startCountdown()
})

// Cleanup interval on unmount
onBeforeUnmount(() => {
  if (countdownInterval) {
    clearInterval(countdownInterval)
  }
})

const startCountdown = () => {
  countdownInterval = setInterval(() => {
    countdown.value--
    
    if (countdown.value <= 0) {
      clearInterval(countdownInterval)
      showCountdown.value = false
      showVideo.value = true
    }
  }, 1000)
}

const handleVideoEnded = () => {
  console.log('Video playback completed')
  showDoneButton.value = true
}

const handleVideoError = (event) => {
  console.error('Video error:', event)
  videoError.value = 'Failed to load the video. Please check your internet connection and try again.'
}

const retryVideo = () => {
  videoError.value = null
  if (violationVideo.value) {
    violationVideo.value.load()
  }
}

const markViolationAsDone = async () => {
  isSubmitting.value = true
  errorMessage.value = ''
  
  try {
    // Get violation ID from route params
    const violationId = route.params.violationId
    
    if (!violationId) {
      throw new Error('Violation ID is missing from the URL')
    }

    // Get student ID from localStorage (adjust this based on your auth system)
    const studentId = localStorage.getItem('authToken') || localStorage.getItem('studentId')
    
    if (!studentId) {
      throw new Error('Student authentication not found')
    }

    // Update the violation status in Supabase
    // Uncomment and modify this section when you have Supabase configured
    /*
    const { error: updateError } = await supabase
      .from('activity_logs')
      .update({ 
        statusreal: true,
        date_settled: new Date().toISOString()
      })
      .eq('id', violationId)
      .eq('student_id', studentId)

    if (updateError) {
      throw updateError
    }
    */

    // For demo purposes, simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    successMessage.value = 'Violation has been successfully settled!'
    
    // Redirect after 2 seconds
    setTimeout(() => {
      router.push({ name: 'StudentDashboard' }) // Adjust route name as needed
    }, 2000)
    
  } catch (error) {
    console.error('Error settling violation:', error)
    errorMessage.value = error.message || 'Failed to settle violation. Please try again.'
  } finally {
    isSubmitting.value = false
  }
}
</script>

<style scoped>
.settle-violation {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

.content-section {
  background: white;
  padding: 30px;
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  margin-bottom: 30px;
}

.title {
  color: #2c3e50;
  font-size: 2rem;
  font-weight: 600;
  margin-bottom: 20px;
  text-align: center;
}

.instructions {
  line-height: 1.6;
  color: #34495e;
}

.instructions p {
  margin-bottom: 15px;
  text-align: justify;
}

.thank-you {
  font-weight: 500;
  color: #27ae60;
}

.countdown-section {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  margin-bottom: 30px;
}

.countdown-container {
  text-align: center;
  color: white;
}

.countdown-circle {
  width: 100px;
  height: 100px;
  border: 4px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  margin: 0 auto 20px;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
}

.countdown-number {
  font-size: 2.5rem;
  font-weight: bold;
}

.countdown-text {
  font-size: 1.2rem;
  margin: 0;
}

.video-section {
  margin-bottom: 30px;
}

.video-container {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  background: #000;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

.video-container video {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.video-error {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  text-align: center;
  padding: 20px;
}

.retry-button {
  background: #e74c3c;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 1rem;
  margin-top: 10px;
  transition: background 0.3s;
}

.retry-button:hover {
  background: #c0392b;
}

.done-section {
  text-align: center;
  background: white;
  padding: 30px;
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.done-button {
  background: linear-gradient(135deg, #27ae60, #2ecc71);
  color: white;
  border: none;
  padding: 15px 40px;
  border-radius: 8px;
  font-size: 1.2rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  box-shadow: 0 4px 15px rgba(39, 174, 96, 0.3);
}

.done-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(39, 174, 96, 0.4);
}

.done-button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
  transform: none;
}

.completion-text {
  margin-top: 15px;
  color: #27ae60;
  font-weight: 500;
}

.success-message {
  background: #d4edda;
  color: #155724;
  padding: 15px;
  border-radius: 8px;
  border: 1px solid #c3e6cb;
  text-align: center;
  margin-top: 20px;
  font-weight: 500;
}

.error-message {
  background: #f8d7da;
  color: #721c24;
  padding: 15px;
  border-radius: 8px;
  border: 1px solid #f5c6cb;
  text-align: center;
  margin-top: 20px;
}

/* Responsive Design */
@media (max-width: 768px) {
  .settle-violation {
    padding: 10px;
  }
  
  .content-section {
    padding: 20px;
  }
  
  .title {
    font-size: 1.5rem;
  }
  
  .countdown-circle {
    width: 80px;
    height: 80px;
  }
  
  .countdown-number {
    font-size: 2rem;
  }
  
  .done-button {
    padding: 12px 30px;
    font-size: 1.1rem;
  }
}
</style>