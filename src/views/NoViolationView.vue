<template>
  <div class="no-violation-view">
    <div class="header">
      <h1 style="margin-bottom: 0px; margin-top: 0px;">Hello there!</h1>
    </div>
    <hr style="border: 1px solid #eee; margin-bottom: 5px;">
    <div style="display: flex; justify-content: space-around; background-color: #f9f9f9; padding: 20px; border-radius: 4px;">
      <div style="display: flex; align-items: center;">
        <img src="@/assets/footcount-icon.png" alt="Total Foot Count Icon" style="max-height: 50px; margin-right: 10px;">
        <div>
          <p style="margin: 0; font-weight: bold;">Daily Foot Count</p>
          <p style="margin: 0;">{{ totalFootCount }}</p>
        </div>
      </div>
      <div style="display: flex; align-items: center;">
        <img src="@/assets/newvio-icon.png" alt="New Violation Icon" style="max-height: 50px; margin-right: 10px;">
        <div>
          <p style="margin: 0; font-weight: bold;">New Violations Today</p>
          <p style="margin: 0;">{{ newViolationCount }}</p>
        </div>
      </div>
      <div style="display: flex; align-items: center;">
        <img src="@/assets/unsettled-icon.png" alt="Unsettled Violation Icon" style="max-height: 50px; margin-right: 10px;">
        <div>
          <p style="margin: 0; font-weight: bold;">Unsettled Violations Today</p>
          <p style="margin: 0;">{{ unsettledViolationCountToday }}</p>
        </div>
      </div>
    </div>

    <div class="table-section" style="margin-top: 20px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
        <h2>Non-Violation Log</h2>
        <div class="search-sort">
          <input type="text" placeholder="Search Image URL" v-model="searchQuery" class="search-input" />
          <select v-model="sortBy" class="filter-category" style="margin-left: 10px;">
            <option value="createdAtDesc">Newest</option>
            <option value="createdAtAsc">Oldest</option>
          </select>
        </div>
      </div>

      <div v-if="loading">Loading non-violations...</div>
      <div v-else-if="error">Error loading non-violations: {{ error }}</div>
      <table v-else>
        <thead>
          <tr>
            <th>Timestamp</th>
            <th>Image URL</th> <!-- Changed column header to "Image URL" -->
          </tr>
        </thead>
        <tbody>
          <tr v-for="log in filteredNoViolationLogs" :key="log.id">
            <td>{{ formatDate(log.created_at) }}</td>
            <td>
              <button
                class="view-photo-button"
                @click="showModal(log.image_url)"
                :disabled="!log.image_url"
              >
                View Photo
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-if="!filteredNoViolationLogs.length && !loading && !error">No non-violations found.</p>
    </div>

    <div v-if="isModalVisible" class="image-modal" @click.self="closeModal">
      <div class="modal-content">
        <img :src="modalImageUrl" alt="Non-Violation Image">
        <button class="close-button" @click="closeModal">Close</button>
      </div>
    </div>
  </div>
</template>

<script>
import supabase from '@/components/Supabase';
import moment from 'moment-timezone';

export default {
  data() {
    return {
      noViolationLogs: [],
      loading: true,
      error: null,
      searchQuery: '',
      sortBy: 'createdAtDesc', // Default sort by newest created_at
      isModalVisible: false,
      modalImageUrl: '',
      // Dashboard counts (fetched here for consistency with ActivityLog.vue)
      totalFootCount: 0,
      newViolationCount: 0,
      unsettledViolationCountToday: 0,
      activityLogsForCounts: [], // To store activity logs for dashboard counts
    };
  },
  computed: {
    filteredNoViolationLogs() {
      let filtered = [...this.noViolationLogs]; // Create a mutable copy

      // Filter by search query (assuming 'searchQuery' might look for something in the image URL for now)
      if (this.searchQuery) {
        filtered = filtered.filter(log =>
          log.image_url?.toLowerCase().includes(this.searchQuery.toLowerCase())
        );
      }

      // Sort by created_at
      filtered.sort((a, b) => {
        const dateA = new Date(a.created_at);
        const dateB = new Date(b.created_at);
        if (this.sortBy === 'createdAtAsc') {
          return dateA - dateB;
        } else { // 'createdAtDesc'
          return dateB - dateA;
        }
      });
      return filtered;
    },
  },
  async mounted() {
    await this.fetchNoViolationLogs();
    await this.fetchDashboardCounts(); // Fetch all counts needed for the top boxes
  },
  methods: {
    formatDate(isoString) {
      if (!isoString) return '';
      // Parse as UTC, then convert to PHT for display
      return moment.utc(isoString).tz('Asia/Manila').format('YYYY-MM-DD h:mm:ss A');
    },
    async fetchNoViolationLogs() {
      this.loading = true;
      this.error = null;
      try {
        // Fetch all rows from 'no_violation', using 'image_url'
        const { data, error } = await supabase
          .from('no_violation')
          .select('id, created_at, image_url'); // Updated to select 'image_url'

        if (error) {
          console.error('Error fetching no_violation logs:', error);
          this.error = error.message;
        } else {
          this.noViolationLogs = data;
        }
      } catch (err) {
        console.error('Unexpected error fetching no_violation logs:', err);
        this.error = err.message;
      } finally {
        this.loading = false;
      }
    },
    async fetchDashboardCounts() {
      // This method combines the logic from your ActivityLog to populate the top boxes
      // This means fetching from 'activity_logs' and 'foot_counts'
      try {
        // Fetch Foot Count
        const nowManila = moment().tz('Asia/Manila');
        const startOfTodayManila = nowManila.clone().startOf('day').add(1, 'minute');
        const endOfTodayManila = nowManila.clone().endOf('day').subtract(1, 'second');
        const startISO = startOfTodayManila.toISOString();
        const endISO = endOfTodayManila.toISOString();

        const { data: footData, error: footError } = await supabase
          .from('foot_counts')
          .select('count')
          .gte('timestamp', startISO)
          .lte('timestamp', endISO);

        if (footError) {
          console.error('Error fetching foot count:', footError);
        } else {
          this.totalFootCount = footData.reduce((sum, item) => sum + item.count, 0);
        }

        // Fetch Activity Logs for New/Unsettled Violations Today
        const { data: activityData, error: activityError } = await supabase
          .from('activity_logs')
          .select('id, date_recorded, statusreal'); // Only need these for counts

        if (activityError) {
          console.error('Error fetching activity logs for counts:', activityError);
        } else {
          this.activityLogsForCounts = activityData; // Store for computed properties
          this.calculateNewAndUnsettledViolationCounts();
        }

      } catch (err) {
        console.error('Unexpected error fetching dashboard counts:', err);
      }
    },
    calculateNewAndUnsettledViolationCounts() {
      const startOfTodayPHT = moment().tz('Asia/Manila').startOf('day');
      const endOfTodayPHT = moment().tz('Asia/Manila').endOf('day');

      this.newViolationCount = this.activityLogsForCounts.filter(log => {
        const recordedDatePHT = moment.tz(log.date_recorded, 'Asia/Manila');
        return recordedDatePHT.isBetween(startOfTodayPHT, endOfTodayPHT, null, '[]');
      }).length;

      this.unsettledViolationCountToday = this.activityLogsForCounts.filter(log => {
        const recordedDatePHT = moment.tz(log.date_recorded, 'Asia/Manila');
        return !log.statusreal && recordedDatePHT.isBetween(startOfTodayPHT, endOfTodayPHT, null, '[]');
      }).length;
    },
    showModal(imageUrl) {
      // Use the provided image URL, fallback if it's not a valid URL or null
      this.modalImageUrl = imageUrl && (imageUrl.startsWith('http://') || imageUrl.startsWith('https://'))
                           ? imageUrl
                           : 'https://placehold.co/500x300/DDDDDD/666666?text=No+Image+Available';
      this.isModalVisible = true;
    },
    closeModal() {
      this.isModalVisible = false;
      this.modalImageUrl = '';
    },
  },
};
</script>

<style scoped>
.no-violation-view {
  padding: 20px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.search-sort {
  display: flex;
  align-items: center;
}

.search-input {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.filter-category {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
}

.table-section {
  background-color: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: white;
}

table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 15px;
}

th, td {
  padding: 10px;
  text-align: left;
  border-bottom: 1px solid #ddd;
}

th {
  background-color: #f2f2f2;
}

/* Removed .table-image styles as it's now a button */

.view-photo-button { /* New class for the View Photo button */
  background-color: #FFC500;
  border: none; /* No border for a cleaner button */
  border-radius: 4px;
  color: rgb(0, 0, 0);
  cursor: pointer;
  padding: 8px 12px; /* Adjusted padding for a button */
  font-size: 0.9em;
  transition: background-color 0.2s ease-in-out;
}

.view-photo-button:hover {
  background-color: #e0b000; /* Darker yellow on hover */
}

.view-photo-button:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
  color: #666666;
}

/* Modal Styles - copied from ActivityLog.vue for consistency */
.image-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(0, 0, 0, 0.8);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background-color: #fff;
  border-radius: 8px;
  position: relative;
  max-width: 95vw;
  max-height: 95vh;
  overflow: auto;
}

.modal-content img {
  display: block;
  max-width: 100%;
  max-height: 100%;
  width: auto;
  height: auto;
  object-fit: contain;
}

.close-button {
  position: absolute;
  top: 10px;
  right: 10px;
  background: none;
  border: none;
  font-size: 10px;
  cursor: pointer;
  color: #333;
  opacity: 0.7;
  transition: opacity 0.2s ease-in-out;
}

.close-button:hover {
  opacity: 1;
}
</style>
