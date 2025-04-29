<template>
    <div class="settle-vio">
      <div v-if="loading">Loading violation details...</div>
      <div v-else-if="error">Error loading violation details: {{ error }}</div>
      <div v-else-if="violationDetails" class="student-violations">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
          <h2>Violation Re-Orientation</h2>
        </div>
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
        <p>Thank you for your cooperation!</p>
        <div class="video-container">
          <video
            ref="violationVideo"
            width="640"
            height="360"
            @play="handlePlay"
            @seeked="handleSeeked"
            @pause="handlePause"
          >
            <source src="@/assets/video violation.mp4" type="video/mp4" />
            Your browser does not support the video tag.
          </video>
          <button v-if="isVideoDone" @click="markViolationAsDone" class="done-button">Done</button>
        </div>
      </div>
      <div v-else-if="!loading && !error">
        <p>No unresolved violation details found for this ID.</p>
      </div>
    </div>
  </template>
  
  <script setup>
  import { ref, onMounted } from 'vue';
  import { useRouter, useRoute } from 'vue-router';
  import supabase from '@/components/Supabase'; // Ensure the path is correct
  
  const router = useRouter();
  const route = useRoute();
  
  const violationId = ref(null);
  const violationDetails = ref(null);
  const violationVideo = ref(null);
  const isVideoDone = ref(false);
  const videoDuration = ref(0);
  const lastPlayedTime = ref(0);
  const isTabActive = ref(true);
  const loading = ref(true);
  const error = ref(null);
  
  onMounted(async () => {
    violationId.value = route.params.violationId;
    console.log('SettleViolation - Route params violationId:', route.params.violationId);
    await fetchViolationDetails();
  
    // Setup video listeners when violation details are loaded and the video element exists
    if (violationDetails.value && violationVideo.value) {
      violationVideo.value.addEventListener('loadedmetadata', () => {
        videoDuration.value = violationVideo.value.duration;
      });
  
      // Start playing the video automatically
      violationVideo.value.autoplay = true;
  
      // Check for tab focus changes
      document.addEventListener('visibilitychange', () => {
        isTabActive.value = !document.hidden;
        if (!isTabActive.value && !violationVideo.value.paused) {
          violationVideo.value.pause();
        } else if (isTabActive.value && violationVideo.value.paused && !isVideoDone.value) {
          violationVideo.value.play();
        }
      });
  
      // Attach time update listener on initial play
      violationVideo.value.addEventListener('play', attachTimeUpdateListener);
    }
  });
  
  const handlePlay = () => {
    if (violationVideo.value.currentTime < lastPlayedTime.value) {
      // User tried to seek backward
      violationVideo.value.currentTime = lastPlayedTime.value;
    }
  };
  
  const handleSeeked = () => {
    if (violationVideo.value.currentTime < lastPlayedTime.value) {
      violationVideo.value.currentTime = lastPlayedTime.value;
    } else if (violationVideo.value.currentTime > lastPlayedTime.value + 1) {
      violationVideo.value.currentTime = lastPlayedTime.value;
    }
  };
  
  const handlePause = () => {
    lastPlayedTime.value = violationVideo.value.currentTime;
  };
  
  const handleTimeUpdate = () => {
    if (violationVideo.value && !violationVideo.value.seeking) {
      lastPlayedTime.value = Math.max(lastPlayedTime.value, violationVideo.value.currentTime);
      if (Math.abs(violationVideo.value.currentTime - videoDuration.value) < 0.5 && videoDuration.value > 0) {
        isVideoDone.value = true;
        violationVideo.value.removeEventListener('timeupdate', handleTimeUpdate);
      }
    }
  };
  
  const attachTimeUpdateListener = () => {
    if (violationVideo.value) {
      violationVideo.value.addEventListener('timeupdate', handleTimeUpdate);
    }
  };
  
  const fetchViolationDetails = async () => {
    loading.value = true;
    error.value = null;
    const studentId = localStorage.getItem('authToken');
    console.log('SettleViolation - Auth Token:', studentId);
  
    if (studentId && route.params.violationId) {
      try {
        const { data, error: dbError } = await supabase
          .from('activity_logs')
          .select(`
            id,
            violation_categories (name)
          `)
          .eq('id', route.params.violationId)
          .eq('student_id', studentId)
          .eq('statusreal', false)
          .single();
  
        if (dbError) {
          console.error('Error fetching violation details:', dbError);
          error.value = 'Failed to load violation details.';
        } else {
          violationDetails.value = data;
        }
      } catch (err) {
        console.error('An unexpected error occurred:', err);
        error.value = 'An unexpected error occurred.';
      } finally {
        loading.value = false;
      }
    } else {
      loading.value = false;
      error.value = 'Invalid parameters.';
    }
  };
  
  const markViolationAsDone = async () => {
    if (!route.params.violationId) {
      alert('Violation ID is missing.');
      return;
    }
  
    try {
      const { error: dbError } = await supabase
        .from('activity_logs')
        .update({ statusreal: true, date_settled: new Date() })
        .eq('id', route.params.violationId);
  
      if (dbError) {
        console.error('Error marking violation as done:', dbError);
        alert('Failed to mark violation as done.');
      } else {
        alert('Violation marked as done.');
        router.push({ name: 'StudentDashboard' });
      }
    } catch (err) {
      console.error('An unexpected error occurred while marking as done:', err);
      alert('An unexpected error occurred.');
    }
  };
  </script>
  
  <style scoped>
  /* Your existing styles */
  .settle-vio {
    padding: 20px;
  }
  
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
  }
  
  .student-violations {
    background-color: white;
    padding: 20px;
    border-radius: 8px;
    margin-bottom: 20px;
    position: relative; /* For positioning the done button */
  }
  
  .video-container {
    margin-top: 20px;
    border: 1px solid white;
    border-radius: 4px;
    overflow: hidden; /* To contain the video within the border-radius */
  }
  
  .video-container video::-webkit-media-controls {
    display: none !important;
  }
  
  .video-container video::-webkit-media-controls-enclosure {
    display: none !important;
  }
  
  .done-button {
    position: absolute;
    bottom: 10px;
    right: 10px;
    padding: 10px 20px;
    background-color: #4CAF50; /* Green for success */
    color: white;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    font-size: 16px;
  }
  
  .done-button:disabled {
    background-color: #ccc;
    cursor: not-allowed;
  }
  </style>