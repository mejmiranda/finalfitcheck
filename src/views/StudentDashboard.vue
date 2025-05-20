<template>
  <div class="dashboard">
    <div class="header">
      <h1 style="margin-bottom: 0px; margin-top: 0px;">Hello there!</h1>
    </div>
    <hr style="border: 1px solid #eee; margin-bottom: 5px;">

    <div class="dashboard-header" style="margin-top: 20px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
        <h2></h2>
      </div>
    </div>

    <div class="tabs" v-if="!selectedStudent">
      <button :class="{ active: activeTab === 'unsettled' }" @click="activeTab = 'unsettled'">Unsettled Violations</button>
      <button :class="{ active: activeTab === 'settled' }" @click="activeTab = 'settled'">Settled Violations</button>
      <select class="filter-category" v-model="sortBy">
        <option value="dateDesc">Newest</option>
        <option value="dateAsc">Oldest</option>
      </select>
    </div>

    <div v-if="loading">Loading activity logs...</div>
    <div v-else-if="error">Error loading activity logs: {{ error }}</div>
    <table v-else-if="filteredStudents.length > 0 && !selectedStudent">
      <thead>
        <tr>
          <th>Violation</th>
          <th>Date Recorded</th>
          <th v-if="activeTab === 'settled'">Date Settled</th>
          <th v-if="activeTab === 'unsettled'">Due Date</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="student in filteredStudents" :key="student.id">
          <td>{{ student.violation_category }}</td>
          <td>{{ formatDate(student.date_recorded) }}</td>
          <td v-if="activeTab === 'settled'">{{ formatDate(student.date_settled) }}</td>
          <td v-if="activeTab === 'unsettled'">{{ formatDate(student.due_date) }}</td>
          <td style="text-align: right;">
            <button
              v-if="activeTab === 'unsettled'"
              class="settle-button"
              @click="goToSettleViolation(student)"
            >
              Settle
            </button>
            <button
              class="view-details-button"
              @click="showDetails(student)"
            >
              View Details
            </button>
          </td>
        </tr>
      </tbody>
    </table>
    <div v-else-if="!loading && !error && filteredStudents.length === 0 && !selectedStudent">
      <p>No violations found based on the selected filter.</p>
    </div>

    <div v-if="selectedStudent" class="violation-details-full">
      <h2>Violation Details</h2>
      <div class="details-container">
        <div class="details-image">
          <img
            :src="selectedStudent.image_url || require('@/assets/studentpic.png')"
            alt="Student Image"
            style="max-width: 250px; border-radius: 4px; cursor: zoom-in; margin-left: 1cm; margin-top: 0.5cm;"
            @click="showModal(selectedStudent)"
          />
        </div>
        <div class="details-text" style="font-size: medium;">
          <p><strong>Student Name:</strong> {{ selectedStudent.students?.student_name }}</p>
          <p><strong>Student ID:</strong> {{ selectedStudent.students?.student_number }}</p>
          <p><strong>Violation:</strong> {{ selectedStudent.violation_category }}</p>
          <p><strong>Frequency:</strong> {{ selectedStudent.frequency || 'N/A' }}</p>
          <p><strong>Status:</strong> {{ selectedStudent.status }}</p>
          <p><strong>Date Recorded:</strong> {{ formatDate(selectedStudent.date_recorded) }}</p>
          <p v-if="selectedStudent.date_settled"><strong>Date Settled:</strong> {{ formatDate(selectedStudent.date_settled) }}</p>
          <p v-if="selectedStudent.due_date"><strong>Due Date:</strong> {{ formatDate(selectedStudent.due_date) }}</p>
          <div style="text-align:left; margin-top: 50px;">
            <button class="return-button" @click="selectedStudent = null">Return to List</button>
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
import supabase from '@/components/Supabase'; // Adjust the import path if needed
import { useRouter } from 'vue-router';

export default {
  // Use setup for useRouter in Vue 3 (even with Options API)
  setup() {
    const router = useRouter();
    return { router }; // Make router available in `this`
  },
  data() {
    return {
      activeTab: 'unsettled',
      activityLogs: [], // Will hold the data fetched from Supabase
      searchQuery: '',
      sortBy: 'dateDesc',
      selectedStudent: null, // Holds the details of the currently viewed student violation
      isModalVisible: false,
      modalImageUrl: '', // Holds the URL for the image shown in the modal
      loading: false,
      error: null,
      // Removed router: useRouter() from here as it's now in setup()
    };
  },
  computed: {
    filteredStudents() {
      let filtered = this.activityLogs.filter(log => {
        const isSettled = log.statusreal; // Directly use the boolean value
        const matchesTab =
          (this.activeTab === 'settled' && isSettled) ||
          (this.activeTab === 'unsettled' && !isSettled);
        
        // Ensure that students object and student_name/student_number exist before accessing
        const studentName = log.students?.student_name || '';
        const studentNumber = String(log.students?.student_number || ''); // Convert to string for includes

        const matchesSearch =
          studentName.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
          studentNumber.includes(this.searchQuery);
        
        return matchesTab && matchesSearch;
      });

      const sorted = [...filtered];

      sorted.sort((a, b) => {
        switch (this.sortBy) {
          case 'nameAsc':
            return (a.students?.student_name || '').localeCompare(b.students?.student_name || '');
          case 'nameDesc':
            return (b.students?.student_name || '').localeCompare(a.students?.student_name || '');
          case 'studentId':
            return String(a.students?.student_number || '').localeCompare(String(b.students?.student_number || ''));
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
  methods: {
    formatDate(isoString) {
      if (!isoString) return '';
      const date = new Date(isoString);
      return new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' }).format(date);
    },
    calculateDueDate(isoString) {
      if (!isoString) return null;
      const date = new Date(isoString);
      date.setDate(date.getDate() + 3);
      return date.toISOString();
    },
    showDetails(student) {
      this.selectedStudent = { ...student };
      this.selectedStudent.status = student.statusreal ? 'Settled' : 'Unsettled';

      // IMPORTANT DEBUGGING STEP: Log the selected student data to check image_url
      console.log('Selected Student Details:', this.selectedStudent);
      console.log('Image URL for selected student:', this.selectedStudent.image_url);
    },
    // CORRECTED: showModal to use student.image_url
    showModal(student) {
      if (student && student.image_url) {
        this.modalImageUrl = student.image_url;
        this.isModalVisible = true;
      } else {
        // Fallback for modal if image_url is missing or invalid
        console.warn('Image URL is missing or invalid for modal. Using fallback image.');
        this.modalImageUrl = require('@/assets/studentpic.png'); // Ensure this path is correct
        this.isModalVisible = true;
      }
    },
    closeModal() {
      this.isModalVisible = false;
      this.modalImageUrl = ''; // Clear the image URL when closing the modal
    },
    goToSettleViolation(violation) {
      this.router.push({
        name: 'SettleViolation',
        params: { violationId: violation.id },
      });
    },
    async fetchActivityLogs() {
      this.loading = true;
      this.error = null;
      const studentId = localStorage.getItem('authToken'); // Assuming authToken is the student's ID

      if (studentId) {
        try {
          const { data, error } = await supabase
            .from('activity_logs')
            .select(`
              id,
              student_id,
              category_id,
              date_recorded,
              statusreal,
              image_url,           
              date_settled,
              frequency,
              updated_at,
              violation_category: violation_categories (name),
              students (student_name, student_number)
            `)
            .eq('student_id', studentId); // Filter by the authenticated student's ID

          if (error) {
            console.error('Error fetching activity logs:', error);
            this.error = error.message || 'Failed to load activity logs.';
          } else {
            this.activityLogs = data.map(log => ({
              ...log,
              violation_category: log.violation_category?.name || 'Unknown',
              // Only calculate due_date if the violation is unsettled
              due_date: !log.statusreal ? this.calculateDueDate(log.date_recorded) : null,
            }));
            // IMPORTANT DEBUGGING STEP: Log fetched activity logs to inspect image_url
            console.log('Fetched Activity Logs:', this.activityLogs);
          }
        } catch (err) {
          console.error('An unexpected error occurred during fetchActivityLogs:', err);
          this.error = 'An unexpected error occurred.';
        } finally {
          this.loading = false;
        }
      } else {
        console.warn('No authentication token found. Cannot fetch activity logs.');
        this.loading = false;
        this.error = 'Not authenticated. Please log in.';
      }
    },
  },
  mounted() {
    this.fetchActivityLogs();
  },
  // If using Vue Router with keep-alive, activated hook is useful for re-fetching
  activated() {
    this.fetchActivityLogs(); // Refetch data when the component is revisited (e.g., from a cached route)
  },
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

.dashboard-header {
  margin-top: 20px;
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
  font-weight: bold; /* Added for better visibility */
}

.tabs button.active {
  background-color: #FFC500;
  color: rgb(0, 0, 0);
  border-color: #FFC500; /* Match border color */
}

.filter-category {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  margin-left: auto; /* Push to the right */
}

table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 15px; /* Added some top margin */
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

tr:hover {
  background-color: #f5f5f5; /* Add hover effect for table rows */
}

.view-details-button,
.settle-button {
  background-color: #FFC500;
  border: 1px solid #FFC500;
  border-radius: 4px;
  color: rgb(0, 0, 0);
  cursor: pointer;
  padding: 8px 12px;
  font-size: 0.8em;
  margin-left: 5px;
  transition: background-color 0.2s ease; /* Smooth transition */
}

.view-details-button:hover,
.settle-button:hover {
  background-color: #e0b000; /* Darker yellow on hover */
}

.settle-button {
  background-color: #FFC500;
  border-color: #FFC500;
  color: black;
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
  font-size: 1.5em; /* Slightly larger heading */
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
  /* Removed fixed width, max-width on img inside is better */
}

.violation-details-full .details-image img {
  max-width: 200px;
  height: auto;
  border-radius: 4px;
  cursor: zoom-in;
  display: block; /* Ensure no extra space below image */
}

.violation-details-full .details-text {
  flex: 1;
}

.violation-details-full .details-text p {
  margin-bottom: 8px; /* Spacing between detail lines */
}

.violation-details-full .return-button {
  background-color: #FFC500;
  color: black;
  border: none;
  padding: 10px 15px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1em;
  margin-top: 20px; /* Added more space below text */
  transition: background-color 0.2s ease;
}

.violation-details-full .return-button:hover {
  background-color: #e0b000;
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
  padding: 0px;
  position: relative;
  max-width: 90vw; /* Adjusted for larger modal images */
  max-height: 150vh; /* Adjusted for larger modal images */
  overflow: auto;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2); /* Add shadow */
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
  font-size: 10px; /* Larger close button */
  cursor: pointer;
  color: #333;
  opacity: 0.7;
  transition: opacity 0.2s ease-in-out;
}

.close-button:hover {
  opacity: 1;
  color: #000; /* Darker on hover */
}
</style>