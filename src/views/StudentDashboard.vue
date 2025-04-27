<template>
    <div class="dashboard">
      <div class="header">
        <h1 style="margin-bottom: 0px; margin-top: 0px;">Hello there, Powerpuff!</h1>
      </div>
      <hr style="border: 1px solid #eee; margin-bottom: 20px;">
  
      <div v-if="hasUnresolvedDressCodeViolation" class="student-violations">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
          <h2>Dress Code Re-Orientation</h2>
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
  
        <div class="video-container" v-if="hasUnresolvedDressCodeViolation">
          <video ref="violationVideo" width="640" height="360" @play="handlePlay" @seeked="handleSeeked" @pause="handlePause">
            <source src="@/assets/video violation.mp4" type="video/mp4">
            Your browser does not support the video tag.
          </video>
          <button v-if="isVideoDone" @click="markViolationAsDone" class="done-button">Done</button>
        </div>
      </div>
      <div v-else>
        <p>No unresolved violation.</p>
      </div>
    </div>
  </template>
  
  <script setup>
  import { ref, onMounted } from 'vue';
  // Assuming you have an auth store to get the current student's ID
  // import { useAuthStore } from '@/stores/auth';
  
  const hasUnresolvedDressCodeViolation = ref(true); // Replace with actual data fetching
  const violationVideo = ref(null);
  const isVideoDone = ref(false);
  const videoDuration = ref(0);
  const lastPlayedTime = ref(0);
  const isTabActive = ref(true);
  
  // const authStore = useAuthStore();
  // const currentStudentId = authStore.studentId;
  
  onMounted(() => {
    if (violationVideo.value) {
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
  
    // --- Placeholder for fetching student violations ---
    // Replace this with your actual API call
    // try {
    //   // ... fetch violations and set hasUnresolvedDressCodeViolation.value
    // } catch (error) {
    //   console.error('Error fetching violations:', error);
    // }
  });
  
  const handlePlay = () => {
    if (violationVideo.value.currentTime < lastPlayedTime.value) {
      // User tried to seek backward (shouldn't happen without controls, but just in case)
      violationVideo.value.currentTime = lastPlayedTime.value;
    }
  };
  
  const handleSeeked = () => {
    // This event might still trigger due to internal browser behavior, although controls are hidden
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
  
  const markViolationAsDone = async () => {
    // --- Placeholder for marking violation as done on the backend ---
    // Replace this with your actual API call
    // try {
    //   // ...
    // } catch (error) {
    //   // ...
    // }
  
    // --- For demonstration ---
    hasUnresolvedDressCodeViolation.value = false;
    alert('Violation marked as done (simulated).');
  };
  </script>
  
  <style scoped>
  /* Your existing styles */
  .dashboard {
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
    background-color: #ffc107;
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