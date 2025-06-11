<template>
  <div class="activity-log">
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

    <div class="activity-log-header" style="margin-top: 20px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
        <h2>Activity Log</h2>

      </div>
    </div>

    <div class="tabs" v-if="!selectedViolation">
      <button :class="{ active: activeTab === 'settled' }" @click="activeTab = 'settled'">Settled Violations</button>
      <button :class="{ active: activeTab === 'unsettled' }" @click="activeTab = 'unsettled'">Unsettled Violations</button>
      <select class="filter-category" v-model="sortBy">
        <option value="dateDesc">Newest</option>
        <option value="dateAsc">Oldest</option>
        <option value="nameAsc">Name (A-Z)</option>
        <option value="nameDesc">Name (Z-A)</option>
      </select>
      <div class="search-sort" style="margin-left: 586px;">
        <input type="text" placeholder="Search Name" v-model="searchQuery" class="search-input" />
      </div>
    </div>

    <div v-if="loading">Loading activity log...</div>
    <div v-else-if="error">Error loading activity log: {{ error }}</div>
    <table v-else-if="!selectedViolation">
      <thead>
        <tr>
          <th>Student Name</th>
          <th>Student Number</th>
          <th>Violation</th>
          <th>Date and Time</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="log in filteredActivityLogs" :key="log.id">
          <td>
            <div class="student-name-cell">
              {{ log.students?.student_name }}
            </div>
          </td>
          <td>{{ log.students?.student_number }}</td>
          <td>{{ log.violation_categories?.name }}</td>
          <td>
            <span v-if="!log.statusreal && log.date_recorded">{{ formatDate(log.date_recorded) }}</span>
            <span v-else-if="log.statusreal && log.date_settled">{{ formatDate(log.date_settled) }}</span>
            <span v-else>--</span>
          </td>
          <td style="text-align: right;">
            <button
              class="view-details-button"
              @click="showDetails(log)"
            >
              View Details
            </button>
          </td>
        </tr>
      </tbody>
    </table>

    <div v-if="selectedViolation" class="violation-details-full">
      <h2>Violation Details</h2>
      <div class="details-container">
        <div class="details-image">
          <img
            :src="selectedViolation.image_url || require('@/assets/studentpic.png')"
            alt="Student Image"
            style="max-width: 250px; border-radius: 4px; cursor: zoom-in; margin-left: 1cm; margin-top: 0.5cm;"
            @click="showModal(selectedViolation)"
          />
        </div>
        <div class="details-text" style="font-size: medium;">
          <p><strong>Student Name:</strong> {{ selectedViolation.students?.student_name }}</p>
          <p><strong>Student Number:</strong> {{ selectedViolation.students?.student_number }}</p>
          <p><strong>Violation:</strong> {{ selectedViolation.violation_categories?.name }}</p>
          <p><strong>Frequency:</strong> {{ selectedViolation.frequency }}</p>
          <p><strong>Status:</strong> {{ selectedViolation.statusreal ? 'Settled' : 'Unsettled' }}</p>
          <p>
            <strong>Date Recorded:</strong>
            <span v-if="selectedViolation.date_recorded">{{ formatDate(selectedViolation.date_recorded) }}</span>
            <span v-else>--</span>
          </p>
          <p v-if="selectedViolation.statusreal">
            <strong>Date Settled:</strong>
            <span v-if="selectedViolation.date_settled">{{ formatDate(selectedViolation.date_settled) }}</span>
            <span v-else>--</span>
          </p>
          <p v-else>
            <strong>Due Date:</strong>
            <span v-if="selectedViolation.due_date">{{ formatDate(selectedViolation.due_date) }}</span>
            <span v-else>--</span>
          </p>
          <div style="text-align:left; margin-top: 50px;">
            <button class="return-button" @click="selectedViolation = null">Return to List</button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="isModalVisible" class="image-modal" @click.self="closeModal">
      <div class="modal-content">
        <img :src="modalImageUrl" alt="Large Student Image">
        <button class="close-button" @click="closeModal">Close</button>
      </div>
    </div>
  </div>
</template>

<script>
import supabase from '@/components/Supabase';
import moment from 'moment-timezone'; // Ensure moment-timezone is installed

export default {
  data() {
    return {
      loading: false,
      error: null,
      activityLogs: [],
      activeTab: 'unsettled',
      searchQuery: '',
      sortBy: 'dateDesc',
      selectedViolation: null,
      isModalVisible: false,
      modalImageUrl: '',
      totalFootCount: 0,
      newViolationCount: 0,
      // unsettledViolationCount: 0, // This computed property will replace this
    };
  },
  computed: {
    unsettledViolationCountToday() {
      const startOfTodayPHT = moment().tz('Asia/Manila').startOf('day');
      const endOfTodayPHT = moment().tz('Asia/Manila').endOf('day');

      return this.activityLogs.filter(log => {
        const recordedDatePHT = moment.tz(log.date_recorded, 'Asia/Manila');
        // Only count unsettled violations that were recorded today
        return !log.statusreal && recordedDatePHT.isBetween(startOfTodayPHT, endOfTodayPHT, null, '[]');
      }).length;
    },
    filteredActivityLogs() {
      let filtered = this.activityLogs.filter(log => {
        const studentName = log.students?.student_name?.toLowerCase() || '';
        const violationName = log.violation_categories?.name?.toLowerCase() || '';
        const searchText = this.searchQuery.toLowerCase();

        const matchesSearch = studentName.includes(searchText) || violationName.includes(searchText);

        const settledFilter = this.activeTab === 'settled';
        const isSettled = !!log.statusreal;

        return matchesSearch && (this.activeTab === '' || (settledFilter === isSettled));
      });

      const sorted = [...filtered];

      sorted.sort((a, b) => {
        switch (this.sortBy) {
          case 'nameAsc':
            return a.students?.student_name?.localeCompare(b.students?.student_name);
          case 'nameDesc':
            return b.students?.student_name?.localeCompare(a.students?.student_name);
          case 'dateAsc':
            return new Date(a.date_recorded) - new Date(b.date_recorded);
          case 'dateDesc':
          default:
            return new Date(b.date_recorded) - new Date(a.date_recorded);
        }
      });
      return sorted;
    },
  },
  async mounted() {
    await this.fetchActivityLog();
    await this.fetchCurrentDayFootCount();
    // No need to call calculateDashboardCounts directly here if it's reactive to activityLogs changes
  },
  methods: {
    formatDate(isoString) {
      if (!isoString) return '';
      // Change: Let moment intelligently parse the ISO string first, then convert to PHT
      // This handles cases where 'isoString' might include 'Z' for UTC or a timezone offset
      return moment(isoString).tz('Asia/Manila').format('YYYY-MM-DD h:mm:ss A');
    },
    async fetchCurrentDayFootCount() {
      try {
        const nowManila = moment().tz('Asia/Manila');
        const startOfTodayManila = nowManila.clone().startOf('day').add(1, 'minute');
        const endOfTodayManila = nowManila.clone().endOf('day').subtract(1, 'second');

        const startISO = startOfTodayManila.toISOString();
        const endISO = endOfTodayManila.toISOString();

        console.log('Fetching foot count for PHT:', startOfTodayManila.format(), 'to', endOfTodayManila.format());

        const { data, error } = await supabase
          .from('foot_counts')
          .select('count')
          .gte('timestamp', startISO)
          .lte('timestamp', endISO);

        if (error) {
          console.error('Error fetching current day foot count:', error);
        } else {
          this.totalFootCount = data.reduce((sum, item) => sum + item.count, 0);
        }
      } catch (err) {
        console.error('Unexpected error fetching foot count:', err);
      }
    },
    async fetchActivityLog() {
      this.loading = true;
      this.error = null;
      try {
        const { data, error } = await supabase
          .from('activity_logs')
          .select(`
            id,
            date_recorded,
            statusreal,
            frequency,
            date_settled,
            due_date,
            image_url,
            students (
              student_number,
              student_name
            ),
            violation_categories (
              id,
              name
            )
          `);

        if (error) {
          console.error('Error fetching activity log:', error);
          this.error = error.message;
        } else {
          this.activityLogs = data;
          this.calculateDashboardCounts(); // Recalculate counts after activity logs are fetched
        }
      } catch (err) {
        console.error('Unexpected error fetching activity log:', err);
        this.error = err.message;
      } finally {
        this.loading = false;
      }
    },
    showDetails(log) {
      this.selectedViolation = log;
      this.modalImageUrl = log.image_url || require('@/assets/studentpic.png');
    },
    showModal(violation) {
      // Ensure 'violation' object is passed, not just image_url
      const imageUrl = violation && violation.image_url
                       ? violation.image_url
                       : require('@/assets/studentpic.png'); // Fallback if no valid image_url
      
      this.modalImageUrl = imageUrl;
      this.isModalVisible = true;
    },
    closeModal() {
      this.isModalVisible = false;
      this.modalImageUrl = '';
    },
    calculateDashboardCounts() {
      const startOfTodayPHT = moment().tz('Asia/Manila').startOf('day');
      const endOfTodayPHT = moment().tz('Asia/Manila').endOf('day');

      this.newViolationCount = this.activityLogs.filter(log => {
        const recordedDatePHT = moment.tz(log.date_recorded, 'Asia/Manila');
        return recordedDatePHT.isBetween(startOfTodayPHT, endOfTodayPHT, null, '[]');
      }).length;
      // unsettledViolationCountToday is already a computed property, so it will update automatically
    },
  },
};
</script>

<style scoped>
/* Your existing styles remain unchanged */
.activity-log {
  padding: 20px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.activity-log-header {
  margin-top: 20px;
}

.search-sort {
  display: flex;
  align-items: center;
}

.search-input {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  margin-left: 10px;
}

.tabs {
  display: flex;
  margin-bottom: 20px;
}

.tabs button {
  padding: 10px 20px;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  margin-right: 10px;
  background-color: #f9f9f9;
}

.tabs button.active {
  background-color: #FFC500;
  color: rgb(0, 0, 0);
}

.filter-category {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th,
td {
  padding: 10px;
  text-align: left;
  border-bottom: 1px solid #ddd;
}

th {
  background-color: #f2f2f2;
}

.student-name-cell {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.view-details-button {
  background-color: #FFC500;
  border: 5px solid #FFC500;
  border-radius: 4px;
  color: rgb(0, 0, 0);
  cursor: pointer;
  padding: 0;
  font-size: 0.8em;
}

.violation-details-full {
  padding: 20px;
  border: 1px solid #eee;
  border-radius: 4px;
  background-color: #f9f9f9;
  margin-top: 20px;
  font-size: 0.9em;
}

.violation-details-full h2 {
  margin-top: 0;
  margin-bottom: 10px;
  font-size: 1.2em;
}

.violation-details-full .details-container {
  display: flex;
  align-items: flex-start;
  gap: 20px;
}

.violation-details-full .details-image {
  flex-shrink: 0;
  width: auto;
  margin-right: 1in;
}

.violation-details-full .details-image img {
  max-width: 200px;
  height: auto;
  border-radius: 4px;
  cursor: zoom-in;
}

.violation-details-full .details-text {
  flex: 1;
}

.violation-details-full .return-button {
  background-color: #FFC500;
  color: black;
  border: none;
  padding: 10px 15px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1em;
}

/* Modal Styles */
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
