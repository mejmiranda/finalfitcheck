<template>
  <div class="settle-vio" :class="{ 'fullscreen-video': isFullscreen }">
    <div v-if="loading">Loading violation details...</div>
    <div v-else-if="errorMessage">Error loading violation details: {{ errorMessage }}</div>
    <div v-else-if="violationDetails" class="student-violations">
      <div
        v-if="!isFullscreen"
        style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;"
      >
        <h2>Violation Re-Orientation</h2>
      </div>
      <p v-if="!isFullscreen">
        In accordance with our dress code policy, you are required to complete a re-orientation by viewing the
        instructional video provided below. To ensure proper compliance, the video must be watched in full—skipping or
        interrupting the playback may result in the session not being recognized by the system.
      </p>
      <p v-if="!isFullscreen">
        The system will automatically mark the violation as settled only after the video has been fully viewed without
        interruption. Kindly complete this requirement within three (3) days to avoid the violation being recorded as a
        liability in your portal.
      </p>
      <p v-if="!isFullscreen">Thank you for your cooperation!</p>
      <div class="video-container">
        <video
          ref="violationVideo"
          width="100%"
          height="100%"
          @play="handlePlay"
          @seeked="handleSeeked"
          @pause="handlePause"
          @ended="handleVideoEnded"
          crossorigin="anonymous"
        >
          <source src="https://nnmqgnqghavkzsktcilw.supabase.co/storage/v1/object/public/reorientation//video_violations.mp4" type="video/mp4" />
          Your browser does not support the video tag.
        </video>
        <button v-if="isVideoDone && !isFullscreen" @click="markViolationAsDone" class="done-button">Done</button>
      </div>
    </div>
    <div v-else-if="!loading && !errorMessage && !isFullscreen">
      <p>No unresolved violation details found for this ID.</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue';
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
const errorMessage = ref(null); // Renamed to avoid conflict with the built-in error object
const isFullscreen = ref(false);
const blockKeys = ref(false); // New ref to control key blocking

// Ref to hold the fullscreen change listener so we can remove it
const fullscreenChangeListener = ref(null);
const visibilityChangeListener = ref(null);
const keydownListener = ref(null);

onMounted(async () => {
  violationId.value = route.params.violationId;
  console.log('SettleViolation - Route params violationId:', route.params.violationId);
  await fetchViolationDetails();

  // Setup video listeners when violation details are loaded and the video element exists
  if (violationDetails.value && violationVideo.value) {
    violationVideo.value.addEventListener('loadedmetadata', () => {
      videoDuration.value = violationVideo.value.duration;
      // Request fullscreen after metadata is loaded
      requestFullscreen();
    });

    // Start playing the video automatically
    violationVideo.value.autoplay = true;

    // Prevent exiting fullscreen manually
    fullscreenChangeListener.value = handleFullscreenChange;
    document.addEventListener('fullscreenchange', fullscreenChangeListener.value);
    document.addEventListener('webkitfullscreenchange', fullscreenChangeListener.value);
    document.addEventListener('mozfullscreenchange', fullscreenChangeListener.value);
    document.addEventListener('MSFullscreenChange', fullscreenChangeListener.value);

    // Prevent default exit on keydown while fullscreen
    keydownListener.value = preventFullscreenExit;
    window.addEventListener('keydown', keydownListener.value);

    // Check for tab focus changes
    visibilityChangeListener.value = handleVisibilityChange;
    document.addEventListener('visibilitychange', visibilityChangeListener.value);

    // Start blocking keys when the video starts playing
    violationVideo.value.addEventListener('play', () => {
      blockKeys.value = true;
      attachTimeUpdateListener(); // Ensure timeupdate listener is attached on play
    });
  }
});

onBeforeUnmount(() => {
  // Clean up event listeners
  if (fullscreenChangeListener.value) {
    document.removeEventListener('fullscreenchange', fullscreenChangeListener.value);
    document.removeEventListener('webkitfullscreenchange', fullscreenChangeListener.value);
    document.removeEventListener('mozfullscreenchange', fullscreenChangeListener.value);
    document.removeEventListener('MSFullscreenChange', fullscreenChangeListener.value);
  }
  if (keydownListener.value) {
    window.removeEventListener('keydown', keydownListener.value);
  }
  if (visibilityChangeListener.value) {
    document.removeEventListener('visibilitychange', visibilityChangeListener.value);
  }
  window.removeEventListener('keydown', globalKeyBlocker); // Ensure global key blocker is removed
  if (violationVideo.value) {
    violationVideo.value.removeEventListener('timeupdate', handleTimeUpdate); // Clean up timeupdate listener
  }
});

const requestFullscreen = () => {
  const video = violationVideo.value;
  if (video) {
    if (video.requestFullscreen) {
      video.requestFullscreen();
    } else if (video.webkitRequestFullscreen) { /* Safari */
      video.webkitRequestFullscreen();
    } else if (video.msRequestFullscreen) { /* IE11 */
      video.msRequestFullscreen();
    }
    isFullscreen.value = true;
  }
};

const exitFullscreen = () => {
  if (document.exitFullscreen) {
    document.exitFullscreen();
  } else if (document.webkitExitFullscreen) { /* Safari */
    document.webkitExitFullscreen();
  } else if (document.mozCancelFullScreen) { /* Firefox */
    document.mozCancelFullScreen();
  } else if (document.msExitFullscreen) { /* IE11 */
    document.msExitFullscreen();
  }
  isFullscreen.value = false;
};

const handleFullscreenChange = () => {
  isFullscreen.value = !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement);
  // If exiting fullscreen manually before the video is done, re-enter fullscreen
  if (!isFullscreen.value && !isVideoDone.value) {
    // Use a slight delay to avoid immediate re-entry if the user quickly tries to switch tabs
    setTimeout(requestFullscreen, 100);
  }
};

const preventFullscreenExit = (event) => {
  // Prevent ESC key and other fullscreen exit keys if video is not done
  if (!isVideoDone.value && (event.key === 'Escape' || event.keyCode === 27 || event.key === 'F11' || event.keyCode === 122)) {
    event.preventDefault();
  } else if (isVideoDone.value && isFullscreen.value && (event.key === 'Escape' || event.keyCode === 27 || event.key === 'F11' || event.keyCode === 122)) {
    exitFullscreen();
  }
};

const handleVisibilityChange = () => {
  isTabActive.value = !document.hidden;
  if (!isTabActive.value && violationVideo.value && !violationVideo.value.paused && !isVideoDone.value && isFullscreen.value) {
    violationVideo.value.pause();
  } else if (isTabActive.value && violationVideo.value && violationVideo.value.paused && !isVideoDone.value && isFullscreen.value) {
    violationVideo.value.play();
  }
};

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

const globalKeyBlocker = (event) => {
  if (blockKeys.value && !isVideoDone.value) {
    event.preventDefault();
  }
};

const handleTimeUpdate = () => {
  if (violationVideo.value && !violationVideo.value.seeking) {
    lastPlayedTime.value = Math.max(lastPlayedTime.value, violationVideo.value.currentTime);
    if (Math.abs(violationVideo.value.currentTime - videoDuration.value) < 0.5 && videoDuration.value > 0) {
      isVideoDone.value = true;
      exitFullscreen();
      removeFullscreenBlockers();
      blockKeys.value = false; // Stop blocking keys
      window.removeEventListener('keydown', globalKeyBlocker);
      violationVideo.value.removeEventListener('timeupdate', handleTimeUpdate);
    }
  }
};

const handleVideoEnded = () => {
  isVideoDone.value = true;
  exitFullscreen();
  removeFullscreenBlockers();
  blockKeys.value = false; // Stop blocking keys
  window.removeEventListener('keydown', globalKeyBlocker);
  violationVideo.value.removeEventListener('timeupdate', handleTimeUpdate);
};

const attachTimeUpdateListener = () => {
  if (violationVideo.value) {
    violationVideo.value.addEventListener('timeupdate', handleTimeUpdate);
  }
};

const fetchViolationDetails = async () => {
  loading.value = true;
  errorMessage.value = null; // Renamed to avoid conflict with the built-in error object
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
        errorMessage.value = 'Failed to load violation details.';
      } else {
        violationDetails.value = data;
      }
    } catch (err) {
      console.error('An unexpected error occurred:', err);
      errorMessage.value = 'An unexpected error occurred.';
    } finally {
      loading.value = false;
    }
  } else {
    loading.value = false;
    errorMessage.value = 'Invalid parameters.';
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

const removeFullscreenBlockers = () => {
  if (fullscreenChangeListener.value) {
    document.removeEventListener('fullscreenchange', fullscreenChangeListener.value);
    document.removeEventListener('webkitfullscreenchange', fullscreenChangeListener.value);
    document.removeEventListener('mozfullscreenchange', fullscreenChangeListener.value);
    document.removeEventListener('MSFullscreenChange', fullscreenChangeListener.value);
    fullscreenChangeListener.value = null;
  }
  if (keydownListener.value) {
    window.removeEventListener('keydown', keydownListener.value);
    keydownListener.value = null;
  }
};

// Attach the global key blocker on component mount (after video element is available)
watch(violationVideo, (newVideo) => {
  if (newVideo) {
    window.addEventListener('keydown', globalKeyBlocker);
  }
});
</script>

<style scoped>
/* Your existing styles */
.settle-vio {
  padding: 20px;
  transition: padding 0.3s ease; /* For smooth transition in/out of fullscreen */
}

.settle-vio.fullscreen-video {
  padding: 0;
  margin: 0;
  width: 100vw;
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: black; /* Optional: Black background for fullscreen */
  z-index: 1000; /* Ensure it's on top of other elements */
  position: fixed;
  top: 0;
  left: 0;
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
  margin-left: 20px;
  width: 100%; /* Take full width in normal mode */
  max-width: 640px; /* Limit width in normal mode */
}

.settle-vio.fullscreen-video .student-violations {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
  max-width: none; /* No max width in fullscreen */
  padding: 0;
  border-radius: 0;
  margin-bottom: 0;
}

.video-container {
  margin-top: 20px;
  border: 1px solid white;
  border-radius: 4px;
  overflow: hidden; /* To contain the video within the border-radius */
  width: 100%;
  height: auto; /* Adjust height automatically */
  aspect-ratio: 16 / 9; /* Maintain aspect ratio */
}

.settle-vio.fullscreen-video .video-container {
  margin: 0;
  border: none;
  border-radius: 0;
  width: 100%;
  height: 100%;
}

.video-container video {
  display: block; /* Prevent extra space below video */
  width: 100%;
  height: 100%;
  object-fit: contain; /* Ensure video fits within the container */
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
  z-index: 1001; /* Ensure it's above the fullscreen video */
}

.done-button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}
</style>