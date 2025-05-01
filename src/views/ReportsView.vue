<template>
  <div class="reports-container">
    <div class="reports-header">
      <h1 style="font-size: xx-large;">Reports</h1>
      <div class="actions">
        <div class="sort-by">
          <span>View:</span>
          <select v-model="sortBy">
            <option value="daily">Daily</option>
            <option value="weekly">Weekly (Mon-Sat)</option>
            <option value="monthly">Monthly</option>
            <option value="semestral">Semestral (Jan-May / Aug-Dec)</option>
          </select>
        </div>
      </div>
    </div>
    <div class="reports-content">
      <div class="report-summary">
        <div class="most-violated-policy-card">
          <h2>Violated Policy</h2>
          <ul>
            <li v-for="violation in violatedPolicies" :key="violation.policy">
              <div class="policy-name-count">
                <img
                  :src="getPolicyIcon(violation.policy)"
                  :alt="`${violation.policy} Icon`"
                  class="policy-icon"
                >
                <span class="policy-name">{{ violation.policy }}</span>
                <span class="count">Count: {{ violation.count }}</span>
              </div>
              <div class="progress-bar">
                <div
                  class="progress"
                  :style="{ width: getViolationPercentage(violation.policy), backgroundColor: '#ffc107' }"
                ></div>
              </div>
            </li>
            <li v-if="violatedPolicies.length === 0 && !loading">
              <p class="empty-message">No violation data available for this period.</p>
            </li>
            <li v-if="loading">
              <p class="loading-message">Loading violation data...</p>
            </li>
          </ul>
        </div>

        <div class="violation-counts-card">
          <div class="settled-violations">
            <h2>Number of Settled Violations</h2>
            <p class="count">{{ settledViolationsCount }}</p>
          </div>
          <div class="unsettled-violations">
            <h2>Number of Unsettled Violations</h2>
            <p class="count">{{ unsettledViolationsCount }}</p>
          </div>
        </div>
      </div>

      <div class="report-charts">
        <div class="foot-traffic-chart-card">
          <h2>Foot Traffic</h2>
          <div class="chart-placeholder">
            {/* Placeholder for Foot Traffic Chart - will reflect the filtered data */}
          </div>
        </div>

        <div class="total-violations-chart-card">
          <h2>Total Violation</h2>
          <div class="chart-placeholder">
            {/* Placeholder for Total Violation Chart - will reflect the filtered data */}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, watch } from 'vue';
import supabase from '@/components/Supabase'; // Adjust the import path if needed
import unifvioIcon from '@/assets/unifvio.png';
import idvioIcon from '@/assets/idvio.png';
import civivioIcon from '@/assets/civivio.png';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns'; // Correct import from node_modules

export default {
  setup() {
    const sortBy = ref('daily'); // Default to daily view
    const violatedPolicies = ref([]);
    const totalViolationsCount = ref(0);
    const settledViolationsCount = ref(0);
    const unsettledViolationsCount = ref(0);
    const loading = ref(false);
    const error = ref(null);

    const fetchReportData = async (filterType = 'daily') => {
      loading.value = true;
      error.value = null;
      try {
        const today = new Date();
        let startDate, endDate;

        if (filterType === 'daily') {
          startDate = new Date(today);
          startDate.setHours(0, 0, 0, 0);
          endDate = new Date(today);
          endDate.setHours(23, 59, 59, 999);
        } else if (filterType === 'weekly') {
          startDate = startOfWeek(today, { weekStartsOn: 1 }); // Monday
          endDate = endOfWeek(today, { weekStartsOn: 1 }); // Saturday (assuming your week is Mon-Sat)
          endDate.setDate(endDate.getDate() - 1); // Adjust to Saturday
          endDate.setHours(23, 59, 59, 999);
          startDate.setHours(0, 0, 0, 0);
        } else if (filterType === 'monthly') {
          startDate = startOfMonth(today);
          endDate = endOfMonth(today);
          startDate.setHours(0, 0, 0, 0);
          endDate.setHours(23, 59, 59, 999);
        } else if (filterType === 'semestral') {
          const currentMonth = today.getMonth() + 1;
          if (currentMonth >= 1 && currentMonth <= 5) { // January to May
            startDate = new Date(today.getFullYear(), 0, 1); // January 1st
            endDate = new Date(today.getFullYear(), 4, 31); // May 31st
          } else { // August to December
            startDate = new Date(today.getFullYear(), 7, 1); // August 1st
            endDate = new Date(today.getFullYear(), 11, 31); // December 31st
          }
          startDate.setHours(0, 0, 0, 0);
          endDate.setHours(23, 59, 59, 999);
        }

        console.log('Fetching data for:', filterType, 'from:', startDate, 'to:', endDate); // Debugging

        // Fetch all activity logs within the date range, sorted by newest first
        const { data: filteredLogs, error: filteredLogsError } = await supabase
          .from('activity_logs')
          .select('date_recorded, violation_categories(name)')
          .gte('date_recorded', startDate.toISOString())
          .lte('date_recorded', endDate.toISOString())
          .order('date_recorded', { ascending: false });

        if (filteredLogsError) throw filteredLogsError;
        totalViolationsCount.value = filteredLogs.length;

        // Fetch settled violation counts within the date range
        const { data: filteredSettledLogs, error: settledError } = await supabase
          .from('activity_logs')
          .select('id')
          .not('date_settled', 'is', null)
          .gte('date_recorded', startDate.toISOString())
          .lte('date_recorded', endDate.toISOString());
        if (settledError) throw settledError;
        settledViolationsCount.value = filteredSettledLogs.length;

        // Unsettled count is derived
        unsettledViolationsCount.value = totalViolationsCount.value - filteredSettledLogs.length;

        const policyCounts = {};
        const policyTimestamps = {};

        filteredLogs?.forEach(log => {
          const policyName = log.violation_categories?.name;
          if (policyName) {
            policyCounts[policyName] = (policyCounts[policyName] || 0) + 1;
            policyTimestamps[policyName] = log.date_recorded;
          }
        });

        violatedPolicies.value = Object.entries(policyCounts).map(([policy, count]) => ({
          policy,
          count,
          timestamp: policyTimestamps[policy],
        }));

        // Optionally sort violatedPolicies by count initially
        violatedPolicies.value.sort((a, b) => b.count - a.count);

        console.log('Fetched and processed violatedPolicies for:', filterType, violatedPolicies.value); // Debugging
      } catch (err) {
        console.error('Error fetching report data:', err);
        error.value = err.message;
      } finally {
        loading.value = false;
      }
    };

    const getViolationPercentage = (policyName) => {
      const violation = violatedPolicies.value.find(item => item.policy === policyName);
      const count = violation ? violation.count : 0;
      return totalViolationsCount.value > 0 ? (count / totalViolationsCount.value) * 100 + '%' : '0%';
    };

    const getPolicyIcon = (policyName) => {
      if (policyName === 'Improper Uniform') {
        return unifvioIcon;
      } else if (policyName === 'Missing ID') {
        return idvioIcon;
      } else if (policyName === 'Improper Civilian Attire') {
        return civivioIcon;
      }
      return ''; // Default icon if no match
    };

    // Watch for changes in the sortBy value
    watch(sortBy, (newSortBy) => {
      fetchReportData(newSortBy);
    });

    onMounted(() => {
      fetchReportData(); // Initial fetch for the default 'daily' view
    });

    return {
      sortBy,
      violatedPolicies,
      totalViolationsCount,
      settledViolationsCount,
      unsettledViolationsCount,
      loading,
      error,
      getViolationPercentage,
      getPolicyIcon,
    };
  },
};
</script>

<style scoped>
.reports-container {
  font-family: sans-serif;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background-color: #ffffff;
  padding: 20px;
}

.reports-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-left: 20px;
  padding-right: 20px;
}

.reports-header h1 {
  margin: 0;
  color: #333;
  font-size: 16px; /* Reduced font size from xx-large */
}

.reports-header .actions {
  display: flex;
  align-items: center;
}

.reports-header .sort-by {
  display: flex;
  align-items: center;
}

.reports-header .sort-by span {
  margin-right: 10px;
  color: #555;
}

.reports-header .sort-by select {
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  color: #333;
  cursor: pointer; /* Added cursor for better UX */
}

.reports-content {
  flex-grow: 1;
}

.report-summary {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 20px;
  padding: 0 20px;
}

.most-violated-policy-card {
  background-color: #fff;
  border: 1px solid #eee;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.violation-counts-card {
  display: flex;
  gap: 20px;
  text-align: center;
  align-items: center;
  justify-content: space-around;
  border: none; /* Removed border */
  background-color: transparent; /* Removed background color */
  padding: 0; /* Removed padding */
}

.most-violated-policy-card h2,
.violation-counts-card h2 {
  margin-top: 0;
  margin-bottom: 15px;
  color: #333;
  font-size: 18px;
}

.most-violated-policy-card ul {
  list-style: none;
  padding: 0;
}

.most-violated-policy-card li {
  margin-bottom: 15px;
  display: flex;
  flex-direction: column;
}

.policy-icon {
  width: 25px;
  height: 25px;
  margin-right: 10px;
  vertical-align: middle;
}

.policy-name-count {
  display: flex;
  align-items: center;
  margin-bottom: 5px;
}

.policy-name {
  flex-grow: 1;
  color: #555;
  font-size: 14px;
}

.count {
  margin-left: auto;
  color: #777;
  font-size: 14px;
  margin-left: 10px;
}

.progress-bar {
  background-color: #f8f8f8;
  border-radius: 4px;
  height: 8px;
  margin-left: 35px;
  width: 94%;
  overflow: hidden; /* Corrected typo: overflow:auto to overflow: hidden */
}

.progress {
  height: 100%;
  border-radius: 4px;
  background-color: #ffc107;
}

.settled-violations,
.unsettled-violations {
  padding: 30px; /* Adjusted padding */
  border-radius: 10px;
  font-size: x-large;
  border: 1px solid #ddd;
  background-color: #f9f9f9;
  text-align: center;
}

.violation-counts-card h2 {
  font-size: 20px;
  color: #555;
  margin-bottom: 5px;
}

.violation-counts-card .count {
  font-size: 4.5em;
  font-weight: bold;
  color: #ff9800;
  margin-top: 2px;
  margin-bottom: 2px;
}

/* Report Charts Section */
.report-charts {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 0 20px;
  margin-top: 20px;
}

.foot-traffic-chart-card,
.total-violations-chart-card {
  background-color: #fff;
  border: 1px solid #eee;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.foot-traffic-chart-card h2,
.total-violations-chart-card h2 {
  margin-top: 0;
  margin-bottom: 15px;
  color: #333;
  font-size: 18px;
}

.chart-placeholder {
  min-height: 200px;
  display: flex;
  justify-content: center;
  align-items: center;
  color: #ccc;
  font-style: italic;
}
</style>