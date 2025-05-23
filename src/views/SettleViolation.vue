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
      
      <!-- Loading indicator for video - Only show if video is actually loading -->
      <div v-if="videoLoading && !videoError && !isFullscreen" class="video-loading">
        <div class="loading-spinner"></div>
        <p>Loading video... Please wait.</p>
        <button @click="retryLoading" class="retry-button">Retry Loading</button>
      </div>
      
      <!-- Error message if video fails to load -->
      <div v-if="videoError && !isFullscreen" class="video-error">
        <p>{{ videoError }}</p>
        <button @click="retryLoading" class="retry-button">Retry Loading</button>
      </div>
      
      <div class="video-container" :class="{ 'hidden': videoLoading && !isFullscreen }">
        <video
          ref="violationVideo"
          width="100%"
          height="100%"
          preload="auto"
          @play="handlePlay"
          @seeked="handleSeeked"
          @pause="handlePause"
          @ended="handleVideoEnded"
          @loadstart="handleLoadStart"
          @loadeddata="handleLoadedData"
          @canplay="handleCanPlay"
          @waiting="handleWaiting"
          @playing="handlePlaying"
          @error="handleVideoError"
          @progress="handleProgress"
          @stalled="handleStalled"
          @suspend="handleSuspend"
          @timeupdate="handleTimeUpdate"
        >
          <source :src="videoUrl" type="video/mp4" />
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
import supabase from '@/components/Supabase';

const router = useRouter();
const route = useRoute();

// Direct URL to video - no environment variables
const videoUrl = ref('https://e8fomgss4r3a2uv5.public.blob.vercel-storage.com/video_violations-tcUW7LLerpiqKEcOIPIZTVesHhS2KP.mp4');

const violationId = ref(null);
const violationDetails = ref(null);
const violationVideo = ref(null);
const isVideoDone = ref(false);
const videoDuration = ref(0);
const lastPlayedTime = ref(0);
const isTabActive = ref(true);
const loading = ref(true);
const errorMessage = ref(null);
const isFullscreen = ref(false);
const blockKeys = ref(false);
const videoLoading = ref(true);
const videoError = ref(null);
const loadingTimeout = ref(null);

// Ref to hold the fullscreen change listener so we can remove it
const fullscreenChangeListener = ref(null);
const visibilityChangeListener = ref(null);
const keydownListener = ref(null);

// Set a timeout to detect if video is taking too long to load
const setLoadingTimeout = () => {
  clearTimeout(loadingTimeout.value);
  loadingTimeout.value = setTimeout(() => {
    if (videoLoading.value) {
      videoError.value = "Video is taking too long to load. Please check your internet connection or try again.";
    }
  }, 30000); // 30 seconds timeout
};

// Video loading event handlers with console logs for debugging
const handleLoadStart = () => {
  videoLoading.value = true;
  videoError.value = null;
  console.log('Video loading started');
  setLoadingTimeout();
};

const handleLoadedData = () => {
  console.log('Video data loaded');
  // Don't set videoLoading to false here, wait for canplay
};

const handleCanPlay = () => {
  videoLoading.value = false;
  clearTimeout(loadingTimeout.value);
  console.log('Video can start playing');
};

const handleWaiting = () => {
  videoLoading.value = true;
  console.log('Video is buffering');
};

const handlePlaying = () => {
  videoLoading.value = false;
  console.log('Video is playing');
};

const handleProgress = (event) => {
  if (violationVideo.value && violationVideo.value.buffered.length > 0) {
    const bufferedEnd = violationVideo.value.buffered.end(violationVideo.value.buffered.length - 1);
    const duration = violationVideo.value.duration;
    console.log(`Video buffered: ${Math.round((bufferedEnd / duration) * 100)}%`);
  }
};

const handleStalled = () => {
  console.log('Video has stalled');
};

const handleSuspend = () => {
  console.log('Video loading has been suspended');
};

const handleVideoError = (event) => {
  videoLoading.value = false;
  videoError.value = "Failed to load video. Please check your internet connection and try again.";
  console.error('Video error:', event);
  clearTimeout(loadingTimeout.value);
};

// Function to retry loading the video
const retryLoading = () => {
  if (violationVideo.value) {
    videoLoading.value = true;
    videoError.value = null;
    
    // Force reload the video
    violationVideo.value.load();
    
    // Set timeout again
    setLoadingTimeout();
  }
};

// Preload video when component mounts
const preloadVideo = () => {
  if (violationVideo.value) {
    // Set buffer size for better streaming
    violationVideo.value.preload = 'auto';
    
    // Start loading the video
    violationVideo.value.load();
    
    // Set timeout for loading
    setLoadingTimeout();
  }
};

const fetchViolationDetails = async () => {
  loading.value = true;
  errorMessage.value = null;
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

const requestFullscreen = () => {
  const video = violationVideo.value;
  if (video && video.readyState >= 3) { // Only if video is ready
    if (video.requestFullscreen) {
      video.requestFullscreen();
    } else if (video.webkitRequestFullscreen) {
      video.webkitRequestFullscreen();
    } else if (video.msRequestFullscreen) {
      video.msRequestFullscreen();
    }
    isFullscreen.value = true;
    
    // Start playing once in fullscreen
    video.play().catch(console.error);
  }
};

const exitFullscreen = () => {
  if (document.exitFullscreen) {
    document.exitFullscreen();
  } else if (document.webkitExitFullscreen) {
    document.webkitExitFullscreen();
  } else if (document.mozCancelFullScreen) {
    document.mozCancelFullScreen();
  } else if (document.msExitFullscreen) {
    document.msExitFullscreen();
  }
  isFullscreen.value = false;
};

const handleFullscreenChange = () => {
  isFullscreen.value = !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement);
  if (!isFullscreen.value && !isVideoDone.value) {
    setTimeout(requestFullscreen, 100);
  }
};

const preventFullscreenExit = (event) => {
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
      blockKeys.value = false;
      window.removeEventListener('keydown', globalKeyBlocker);
    }
  }
};

const handleVideoEnded = () => {
  isVideoDone.value = true;
  exitFullscreen();
  removeFullscreenBlockers();
  blockKeys.value = false;
  window.removeEventListener('keydown', globalKeyBlocker);
};

const setupVideoListeners = () => {
  if (violationDetails.value && violationVideo.value) {
    // Preload the video
    preloadVideo();
    
    violationVideo.value.addEventListener('loadedmetadata', () => {
      videoDuration.value = violationVideo.value.duration;
      console.log('Video duration:', videoDuration.value);
      
      // Only request fullscreen after video is ready to play
      if (violationVideo.value.readyState >= 3) { // HAVE_FUTURE_DATA
        requestFullscreen();
      }
    });

    // Start playing the video automatically when it's ready
    violationVideo.value.addEventListener('canplaythrough', () => {
      console.log('Video can play through');
      if (!isFullscreen.value) {
        requestFullscreen();
      }
    });

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
    });
  }
};

onMounted(async () => {
  violationId.value = route.params.violationId;
  console.log('SettleViolation - Route params violationId:', route.params.violationId);
  await fetchViolationDetails();

  // Setup video listeners when violation details are loaded and the video element exists
  setupVideoListeners();
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
  window.removeEventListener('keydown', globalKeyBlocker);
  
  // Clear any timeouts
  clearTimeout(loadingTimeout.value);
});
</script>

<style scoped>
.settle-vio {
  padding: 20px;
  transition: padding 0.3s ease;
}

.settle-vio.fullscreen-video {
  padding: 0;
  margin: 0;
  width: 100vw;
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: black;
  z-index: 1000;
  position: fixed;
  top: 0;
  left: 0;
}

.video-loading, .video-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  background-color: #f8f9fa;
  border-radius: 8px;
  margin: 20px 0;
  text-align: center;
}

.video-error {
  background-color: #fff3f3;
  border: 1px solid #ffcdd2;
  color: #d32f2f;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #3498db;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 15px;
}

.retry-button {
  margin-top: 15px;
  padding: 8px 16px;
  background-color: #3498db;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.retry-button:hover {
  background-color: #2980b9;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
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
  width: 100%;
  max-width: 640px;
}

.settle-vio.fullscreen-video .student-violations {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
  max-width: none;
  padding: 0;
  border-radius: 0;
  margin-bottom: 0;
}

.video-container {
  margin-top: 20px;
  border: 1px solid white;
  border-radius: 4px;
  overflow: hidden;
  width: 100%;
  height: auto;
  aspect-ratio: 16 / 9;
}

.video-container.hidden {
  display: none;
}

.settle-vio.fullscreen-video .video-container {
  margin: 0;
  border: none;
  border-radius: 0;
  width: 100%;
  height: 100%;
}

.video-container video {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
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
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 16px;
  z-index: 1001;
}

.done-button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}
</style>
