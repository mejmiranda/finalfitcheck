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
          <p style="margin: 0; font-weight: bold;">Total Foot Count</p>
        </div>
      </div>
      <div style="display: flex; align-items: center;">
        <img src="@/assets/newvio-icon.png" alt="New Violation Icon" style="max-height: 50px; margin-right: 10px;">
        <div>
          <p style="margin: 0; font-weight: bold;">New Violations</p>
        </div>
      </div>
      <div style="display: flex; align-items: center;">
        <img src="@/assets/unsettled-icon.png" alt="Unsettled Violation Icon" style="max-height: 50px; margin-right: 10px;">
        <div>
          <p style="margin: 0; font-weight: bold;">Unsettled Violations</p>
        </div>
      </div>
    </div>

    <div class="activity-log-header" style="margin-top: 20px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
        <h2>Activity Log</h2>
        <div class="search-sort">
          <input type="text" placeholder="Search Name" v-model="searchQuery" class="search-input" />
        </div>
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
    </div>

    <div v-if="loading">Loading activity log...</div>
    <div v-else-if="error">Error loading activity log: {{ error }}</div>
    <table v-else-if="!selectedViolation">
      <thead>
        <tr>
          <th>Student Name</th>
          <th>Student ID</th>
          <th>Violation</th>
          <th>Date and Time</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="violation in filteredViolations" :key="violation.id">
          <td>
            <div class="student-name-cell">
              {{ violation.students?.student_name }}
            </div>
          </td>
          <td>{{ violation.students?.student_id }}</td>
          <td>{{ violation.violation_categories?.name }}</td>
          <td>{{ violation.date_recorded }}</td>
          <td style="text-align: right;">
            <button
              class="view-details-button"
              @click="showDetails(violation)"
            >
              View Details
            </button>
          </td>
        </tr>
      </tbody>
    </table>
    <p v-else-if="!violations.length && !loading && !error && !selectedViolation">No activity found.</p>

    <div v-if="selectedViolation" class="violation-details-full">
      <h2>Violation Details</h2>
      <div class="details-container">
        <div class="details-image">
          <img
            src="@/assets/studentpic.png"
            alt="Student Image"
            style="max-width: 250px; border-radius: 4px; cursor: zoom-in; margin-left: 1cm; margin-top: 0.5cm;"
            @click="showModal(selectedViolation.students)"
          />
        </div>
        <div class="details-text" style="font-size: medium;">
          <p><strong>Student Name:</strong> {{ selectedViolation.students?.student_name }}</p>
          <p><strong>Student ID:</strong> {{ selectedViolation.students?.student_id }}</p>
          <p><strong>Violation:</strong> {{ selectedViolation.violation_categories?.name }}</p>
          <p><strong>Frequency:</strong> {{ selectedViolation.frequency }}</p>
          <p><strong>Status:</strong> {{ selectedViolation.status }}</p>
          <p><strong>Date Recorded:</strong> {{ selectedViolation.date_recorded }}</p>
          <p v-if="selectedViolation.status === 'settled' && selectedViolation.date_settled">
            <strong>Date Settled:</strong> {{ selectedViolation.date_settled }}
          </p>
          <p v-if="selectedViolation.status === 'unsettled' && selectedViolation.due_date">
            <strong>Due Date:</strong> {{ selectedViolation.due_date }}
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
import supabase from '@/components/Supabase'; // Ensure this path is correct

export default {
  data() {
    return {
      loading: false,
      error: null,
      violations: [],
      activeTab: 'settled',
      searchQuery: '',
      sortBy: 'dateDesc',
      selectedViolation: null, // Renamed from selectedStudent for clarity
      isModalVisible: false,
      modalImageUrl: '',
    };
  },
  computed: {
    filteredViolations() {
      let filtered = this.violations.filter(violation => {
        const studentName = violation.students?.student_name?.toLowerCase() || '';
        const violationName = violation.violation_categories?.name?.toLowerCase() || '';
        const searchText = this.searchQuery.toLowerCase();

        const matchesSearch = studentName.includes(searchText) || violationName.includes(searchText);

        if (this.activeTab === 'settled') {
          return violation.status === 'settled' && matchesSearch;
        } else {
          return violation.status === 'unsettled' && matchesSearch;
        }
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
  },
  methods: {
    async fetchActivityLog() {
      this.loading = true;
      this.error = null;
      try {
        const { data, error } = await supabase
          .from('violations')
          .select(`
            id,
            date_recorded,
            status,
            frequency,
            date_settled,
            due_date,
            students (
              student_id,
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
          this.violations = data;
        }
      } catch (err) {
        console.error('Unexpected error fetching activity log:', err);
        this.error = err.message;
      } finally {
        this.loading = false;
      }
    },
    showDetails(violation) {
      this.selectedViolation = violation; // Renamed to selectedViolation for clarity
    },
    showModal(student) {
      if (student) {
        this.modalImageUrl = require('@/assets/studentpic.png'); // Adjust path if necessary
        this.isModalVisible = true;
      }
    },
    closeModal() {
      this.isModalVisible = false;
      this.modalImageUrl = '';
    },
  },
};
</script>

<style scoped>
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
  display: flex; /* Enable Flexbox */
  align-items: flex-start; /* Align text and image to the top */
  gap: 20px; /* Space between image and text */
}

.violation-details-full .details-image {
  flex-shrink: 0; /* Don't allow image to shrink */
  width: auto; /* Allow image width to adjust based on content */
  margin-right: 1in; /* Add 1 inch margin to the right of the image */
}

.violation-details-full .details-image img {
  max-width: 200px; /* Ensure image doesn't get too large */
  height: auto;
  border-radius: 4px;
  cursor: zoom-in;
}

.violation-details-full .details-text {
  flex: 1; /* Allow text to take up remaining width */
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
  padding: 20px;
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
  font-size: 1.5em;
  cursor: pointer;
  color: #333;
  opacity: 0.7;
  transition: opacity 0.2s ease-in-out;
}

.close-button:hover {
  opacity: 1;
}
</style>