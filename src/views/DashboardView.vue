<template>
  <div class="dashboard">
    <div class="header">
      <h1 style="margin-bottom: 0px; margin-top: 0px;">Hello there!</h1>
    </div>
    <hr style="border: 1px solid #eee; margin-bottom: 5px;">
    <div style="display: flex; justify-content: space-around; background-color: #f9f9f9; padding: 20px; border-radius: 4px;">
      <div style="display: flex; align-items: center;">
        <img src="@/assets/footcount-icon.png" alt="Total Foot Count Icon" style="max-height: 50px; margin-right: 10px;">
        <div>
          <p style="margin: 0; font-weight: bold;">Total Foot Count</p>
          <p style="margin: 0;">{{ totalFootCount }}</p>
        </div>
      </div>
      <div style="display: flex; align-items: center;">
        <img src="@/assets/newvio-icon.png" alt="New Violation Icon" style="max-height: 50px; margin-right: 10px;">
        <div>
          <p style="margin: 0; font-weight: bold;">New Violations</p>
          <p style="margin: 0;">{{ newViolationCount }}</p>
        </div>
      </div>
      <div style="display: flex; align-items: center;">
        <img src="@/assets/unsettled-icon.png" alt="Unsettled Violation Icon" style="max-height: 50px; margin-right: 10px;">
        <div>
          <p style="margin: 0; font-weight: bold;">Unsettled Violations</p>
          <p style="margin: 0;">{{ unsettledViolationCount }}</p>
        </div>
      </div>
    </div>

    <div class="student-violations">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
        <h2>Student Violations</h2>
        <div style="display: flex; align-items: center;">
          <input type="text" placeholder="Search Name" class="search-input" v-model="searchQuery" style="margin-right: 10px;">
          <select v-model="filterStatus" style="margin-right: 10px;">
            <option value="">All Status</option>
            <option :value="true">Settled</option>
            <option :value="false">Unsettled</option>
          </select>
          <select v-model="filterViolation" style="margin-right: 10px;">
            <option value="">All Violations</option>
            <option v-for="category in violationCategories" :key="category.id" :value="category.name">{{ category.name }}</option>
          </select>
          <select v-model="sortBy">
            <option value="dateDesc">Newest</option>
            <option value="dateAsc">Oldest</option>
            <option value="studentName">Name (A-Z)</option>
            <option value="studentNameDesc">Name (Z-A)</option>
          </select>
        </div>
      </div>
      <div v-if="loading">Loading violations...</div>
      <div v-else-if="error">Error loading violations: {{ error }}</div>
      <table v-else>
        <thead>
          <tr>
            <th>Student Name</th>
            <th>Student Number</th>
            <th>Email</th>
            <th>Violation</th>
            <th>Date</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="log in filteredActivityLogs" :key="log.id">
            <td style="font-size: 12px;">{{ log.students?.student_name }}</td>
            <td style="font-size: 12px;">{{ log.students?.student_number }}</td>
            <td style="font-size: 12px;">{{ log.students?.email }}</td>
            <td style="font-size: 12px;">{{ log.violation_categories?.name }}</td>
            <td style="font-size: 12px;">
              {{ log.statusreal && log.date_settled ? formatDate(log.date_settled) : formatDate(log.date_recorded) }}
            </td>
            <td :class="['status', log.statusreal ? 'settled' : 'unsettled']" style="font-size: 12px;">{{ log.statusreal ? 'Settled' : 'Unsettled' }}</td>
          </tr>
        </tbody>
      </table>
      <p v-if="!activityLogsWithDetails.length && !loading && !error">No violations found.</p>
    </div>
  </div>
</template>

<script>
import supabase from '@/components/Supabase'; // Ensure this path is correct

export default {
  data() {
    return {
      activityLogsWithDetails: [],
      loading: true,
      error: null,
      searchQuery: '',
      filterStatus: '',
      filterViolation: '',
      sortBy: 'dateDesc',
      violationCategories: [],
      subscription: null,
      totalFootCount: 0,
      newViolationCount: 0,
    };
  },
  computed: {
    filteredActivityLogs() {
      let filtered = this.activityLogsWithDetails.filter(log =>
        log.students?.student_name?.toLowerCase().includes(this.searchQuery.toLowerCase())
      );

      if (this.filterStatus !== '') {
        filtered = filtered.filter(log => log.statusreal === this.filterStatus);
      }

      if (this.filterViolation) {
        filtered = filtered.filter(log =>
          log.violation_categories?.name?.toLowerCase() === this.filterViolation.toLowerCase()
        );
      }

      const sorted = [...filtered];

      sorted.sort((a, b) => {
        switch (this.sortBy) {
          case 'studentName':
            return a.students?.student_name?.localeCompare(b.students?.student_name);
          case 'studentNameDesc':
            return b.students?.student_name?.localeCompare(a.students?.student_name);
          case 'studentNumber':
            return String(a.students?.student_number).localeCompare(String(b.students?.student_number));
          case 'email':
            return a.students?.email?.localeCompare(b.students?.email);
          case 'dateAsc':
            return new Date(a.date_recorded) - new Date(b.date_recorded);
          case 'dateDesc':
          default:
            return new Date(b.date_recorded) - new Date(a.date_recorded);
        }
      });

      return sorted;
    },
    unsettledViolationCount() {
      return this.activityLogsWithDetails.filter(log => !log.statusreal).length;
    },
  },
  async mounted() {
    await this.fetchActivityLogsWithDetails();
    await this.fetchViolationCategories();
    await this.fetchCurrentDayFootCount(); // Fetch foot count on mount
    this.setupRealtimeSubscription();
    this.calculateDashboardCounts();
  },
  beforeUnmount() {
    if (this.subscription) {
      supabase.removeChannel(this.subscription);
    }
  },
  methods: {
    formatDate(isoString) {
      if (!isoString) return '';
      const date = new Date(isoString);
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`;
    },
    async fetchActivityLogsWithDetails() {
      this.loading = true;
      this.error = null;
      try {
        const { data, error } = await supabase
          .from('activity_logs')
          .select(`
            id,
            date_recorded,
            date_settled,
            statusreal,
            students (
              student_number,
              student_name,
              email
            ),
            violation_categories (
              id,
              name
            )
          `);

        if (error) {
          console.error('Error fetching activity logs:', error);
          this.error = error.message;
        } else {
          this.activityLogsWithDetails = data;
          this.calculateDashboardCounts();
        }
      } catch (err) {
        console.error('Unexpected error fetching activity logs:', err);
        this.error = err.message;
      } finally {
        this.loading = false;
      }
    },
    async fetchViolationCategories() {
      try {
        const { data, error } = await supabase
          .from('violation_categories')
          .select('id, name');

        if (error) {
          console.error('Error fetching violation categories:', error);
        } else {
          this.violationCategories = data;
        }
      } catch (err) {
        console.error('Unexpected error fetching violation categories:', err);
      }
    },
    async fetchCurrentDayFootCount() {
      try {
        const today = new Date();
        const startOfTodayISO = today.toISOString().slice(0, 10) + 'T00:00:00+00:00'; // Midnight UTC
        const endOfTodayISO = today.toISOString().slice(0, 10) + 'T23:59:59+00:00';   // End of day UTC

        const { data, error } = await supabase
          .from('foot_counts')
          .select('count')
          .gte('timestamp', startOfTodayISO)
          .lte('timestamp', endOfTodayISO);

        if (error) {
          console.error('Error fetching current day foot count:', error);
        } else {
          this.totalFootCount = data.reduce((sum, item) => sum + item.count, 0);
        }
      } catch (err) {
        console.error('Unexpected error fetching foot count:', err);
      }
    },
    setupRealtimeSubscription() {
      this.subscription = supabase
        .channel('realtime:activity_logs')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'activity_logs' }, async payload => {
          console.log('Change detected in activity_logs:', payload);
          await this.fetchActivityLogsWithDetails();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'foot_counts' }, async payload => {
          console.log('Change detected in foot_counts:', payload);
          await this.fetchCurrentDayFootCount(); // Refresh foot count on changes
        })
        .subscribe();
    },
    calculateDashboardCounts() {
      // Calculate the count of unsettled violations
      // This is now handled by the unsettledViolationCount computed property

      // Calculate the count of new violations for the current day
      const today = new Date();
      const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

      this.newViolationCount = this.activityLogsWithDetails.filter(log => {
        const recordedDate = new Date(log.date_recorded);
        return recordedDate >= startOfToday && recordedDate < endOfToday;
      }).length;

      // this.totalFootCount is now fetched separately in fetchCurrentDayFootCount
    },
  },
};
</script>

<style scoped>
.dashboard {
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

.data-boxes {
  display: flex;
  justify-content: space-around;
  margin-bottom: 20px;
}

.data-box {
  display: flex;
  align-items: center;
}

.icon-circle {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background-color: yellow;
  display: flex;
  justify-content: center;
  align-items: center;
  margin-right: 10px;
}

.icon-circle img {
  max-height: 30px;
}

.data-text p {
  margin: 0;
}

.data-text p:last-child {
  font-weight: bold;
}

.student-violations {
  background-color: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: white;
}

.table-header {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th, td {
  padding: 10px;
  text-align: left;
  border-bottom: 1px solid #ddd;
}

th {
  background-color: #f2f2f2;
}

.status {
  padding: 5px 10px;
  border-radius: 4px;
  font-size: 12px;
}

.status.settled {
  background-color: #e0f7e9;
  color: #43a047;
}

.status.unsettled {
  background-color: #ffe0b2;
  color: #f57c00;
}
</style>