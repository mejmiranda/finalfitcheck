<template>
  <div class="activity-log">
    <div class="header">
      <h1 style="margin-bottom: 0px; margin-top: 0px;">Hello there!</h1>
    </div>
    <hr style="border: 1px solid #eee; margin-bottom: 5px;">

    <div class="activity-log-header" style="margin-top: 20px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
        <h2>Activity Log</h2>
        <div class="search-sort">
          <input type="text" placeholder="Search Violation" v-model="searchQuery" class="search-input" />
        </div>
      </div>
    </div>

    <div class="tabs" v-if="!selectedStudent">
      <button :class="{ active: activeTab === 'settled' }" @click="activeTab = 'settled'">Settled</button>
      <button :class="{ active: activeTab === 'unsettled' }" @click="activeTab = 'unsettled'">Unsettled</button>
      <select class="filter-category" v-model="sortBy">
        <option value="dateDesc">Newest</option>
        <option value="dateAsc">Oldest</option>
        <option value="violationAsc">Violation (A-Z)</option>
        <option value="violationDesc">Violation (Z-A)</option>
      </select>
    </div>

    <table v-if="!selectedStudent">
      <thead>
        <tr>
          <th>Violation</th>
          <th>Date and Time</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="student in filteredStudents" :key="student.studentId">
          <td>{{ student.violation }}</td>
          <td>{{ student.date }}</td>
          <td style="text-align: right;">
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

    <div v-if="selectedStudent" class="violation-details-full">
      <h2>Violation Details</h2>
      <div class="details-container">
        <div class="details-text" style="font-size: medium;">
          <p><strong>Student Name:</strong> {{ selectedStudent.studentName }}</p>
          <p><strong>Student ID:</strong> {{ selectedStudent.studentId }}</p>
          <p><strong>Violation:</strong> {{ selectedStudent.violation }}</p>
          <p><strong>Status:</strong> {{ selectedStudent.status }}</p>
          <p><strong>Date Recorded:</strong> {{ selectedStudent.date }}</p>
          <p v-if="selectedStudent.settledDate"><strong>Date Settled:</strong> {{ selectedStudent.settledDate }}</p>
          <p v-if="selectedStudent.dueDate"><strong>Due Date:</strong> {{ selectedStudent.dueDate }}</p>
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
export default {
  data() {
    return {
      activeTab: 'unsettled', // Default to unsettled violations
      students: [
        { studentName: 'Christine Joy Manuel', studentId: '211187', email: 'mcjmanuel1@tip.edu.ph', violation: 'Improper Civilian Attire', date: '03/11/2025 13:45:03', settledDate: '03/12/2025 11:68:29', status: 'Settled' },
        { studentName: 'Erica Joy Miranda', studentId: '2111890', email: 'mejmiranda@tip.edu.ph', violation: 'Missing ID', date: '03/10/2025 09:22:15', status: 'Unsettled' },
        { studentName: 'Hans Stephen Lumasang', studentId: '2112260', email: 'mhslumasang@tip.edu.ph', violation: 'Improper Uniform', date: '03/07/2025 16:58:47', status: 'Unsettled' },
        { studentName: 'Jhon Mathew Ramos', studentId: '2112393', email: 'mjmramos@tip.edu.ph', violation: 'Improper Civilian', date: '03/06/2025 11:01:30', settledDate: '03/08/2025 14:33:51', status: 'Settled' },
        { studentName: 'Ashley Nicole Cruz', studentId: '2010567', email: 'ancruz@tip.edu.ph', violation: 'Littering', date: '03/05/2025 08:15:22', status: 'Settled' },
        { studentName: 'Gabriel Dela Cruz', studentId: '2210112', email: 'gdcruz@tip.edu.ph', violation: 'Unauthorized Entry', date: '03/03/2025 17:40:01', status: 'Unsettled' },
        { studentName: 'Isabella Reyes', studentId: '2113001', email: 'ireyes@tip.edu.ph', violation: 'Disruptive Behavior', date: '03/01/2025 10:55:10', settledDate: '03/04/2025 09:00:00', status: 'Settled' },
        { studentName: 'Nathaniel Castro', studentId: '2011987', email: 'ncastro@tip.edu.ph', violation: 'Vandalism', date: '02/28/2025 14:20:35', status: 'Unsettled' },
        { studentName: 'Sophia Perez', studentId: '2210555', email: 'sperez@tip.edu.ph', violation: 'Cheating', date: '02/25/2025 12:30:00', settledDate: '02/27/2025 16:15:42', status: 'Settled' },
        { studentName: 'Daniel Santos', studentId: '2112789', email: 'dsantos@tip.edu.ph', violation: 'Smoking in Prohibited Area', date: '02/22/2025 19:05:28', status: 'Unsettled' },
        { studentName: 'Jane Doe', studentId: '123456', email: 'jane.doe@example.com', violation: 'Dress Code Violation', date: '04/25/2025 10:00:00', status: 'Unsettled' }, // Example dress code violation
      ],
      searchQuery: '',
      sortBy: 'dateDesc',
      selectedStudent: null,
      isModalVisible: false,
      modalImageUrl: '',
    };
  },
  computed: {
    filteredStudents() {
      let filtered = this.students.filter(student => {
        const matchesTab = this.activeTab === 'settled' ? student.status === 'Settled' : student.status === 'Unsettled';
        const matchesSearch = student.violation.toLowerCase().includes(this.searchQuery.toLowerCase());
        return matchesTab && matchesSearch;
      });

      const sorted = [...filtered];

      sorted.sort((a, b) => {
        switch (this.sortBy) {
          case 'violationAsc':
            return a.violation.localeCompare(b.violation);
          case 'violationDesc':
            return b.violation.localeCompare(a.violation);
          case 'dateAsc':
            return new Date(a.date) - new Date(b.date);
          case 'dateDesc':
          default:
            return new Date(b.date) - new Date(a.date);
        }
      });
      return sorted;
    },
    unsettledDressCodeViolationExists() {
      return this.students.some(
        (student) => student.violation === 'Dress Code Violation' && student.status === 'Unsettled'
      );
    },
  },
  methods: {
    showDetails(student) {
      this.selectedStudent = student;
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