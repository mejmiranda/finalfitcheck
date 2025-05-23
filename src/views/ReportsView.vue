<template>
  <div class="reports-container">
    <div class="reports-header">
      <h1 style="font-size: 1.5em;">Reports</h1>
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
            <h2>Settled Violation</h2>
            <p class="count">{{ settledViolationsCount }}</p>
          </div>
          <div class="unsettled-violations">
            <h2>Unsettled Violation</h2>
            <p class="count">{{ unsettledViolationsCount }}</p>
          </div>
        </div>
      </div>

      <div class="report-charts">
        <div class="foot-traffic-chart-card">
          <h2>Foot Traffic</h2>
          <canvas id="footTrafficChart"></canvas>
        </div>

        <div class="total-violations-chart-card">
          <h2>Total Violations</h2>
          <canvas id="totalViolationChart"></canvas>
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
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, format as formatDate, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval } from 'date-fns';
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

export default {
  setup() {
    const sortBy = ref('daily');
    const violatedPolicies = ref([]);
    const totalViolationsCount = ref(0);
    const settledViolationsCount = ref(0);
    const unsettledViolationsCount = ref(0);
    const loading = ref(false);
    const error = ref(null);

    const footTrafficChartInstance = ref(null);
    const totalViolationChartInstance = ref(null);

    const fetchReportData = async (filterType = 'daily') => {
      loading.value = true;
      error.value = null;
      try {
        const today = new Date(); // This `today` is a local Date object (PHT)

        let startDate, endDate;

        if (filterType === 'daily') {
          startDate = new Date(today);
          startDate.setHours(0, 0, 0, 0); // Start at 12 AM (00:00) PHT
          endDate = new Date(today);
          endDate.setHours(23, 59, 59, 999); // End at 11:59:59 PM (23:59:59) PHT
        } else if (filterType === 'weekly') {
          startDate = startOfWeek(today, { weekStartsOn: 1 }); // Monday
          endDate = endOfWeek(today, { weekStartsOn: 1 }); // Sunday
          endDate.setDate(endDate.getDate() - 1); // Adjust to Saturday (as per your previous logic)
          endDate.setHours(23, 59, 59, 999);
          startDate.setHours(0, 0, 0, 0);
        } else if (filterType === 'monthly') {
          startDate = startOfMonth(today);
          endDate = endOfMonth(today);
          startDate.setHours(0, 0, 0, 0);
          endDate = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), 23, 59, 59, 999);
        } else if (filterType === 'semestral') {
          const currentMonth = today.getMonth() + 1;
          let year = today.getFullYear();
          if (currentMonth >= 1 && currentMonth <= 5) { // January to May
            startDate = new Date(year, 0, 1, 0, 0, 0, 0); // January 1st
            endDate = new Date(year, 4, 31, 23, 59, 59, 999); // May 31st
          } else { // August to December
            startDate = new Date(year, 7, 1, 0, 0, 0, 0); // August 1st
            endDate = new Date(year, 11, 31, 23, 59, 59, 999); // December 31st
          }
        }

        console.log('Fetching data for:', filterType, 'from:', startDate, 'to:', endDate); // Debugging

        // Fetch violation logs from Supabase for the entire period
        const { data: allFilteredLogs, error: filteredLogsError } = await supabase
          .from('activity_logs')
          .select('date_recorded, violation_categories(name), statusreal')
          .gte('date_recorded', startDate.toISOString())
          .lte('date_recorded', endDate.toISOString());

        if (filteredLogsError) throw filteredLogsError;

        // Apply "live" filtering to the logs based on current time BEFORE calculating counts
        let currentLiveLogs = [];
        const now = new Date(); // Current local time for "live" cut-off

        if (filterType === 'daily') {
          const currentHour = now.getHours();
          currentLiveLogs = allFilteredLogs.filter(log => {
            const logDate = new Date(log.date_recorded);
            return logDate.getHours() <= currentHour;
          });
        } else if (filterType === 'weekly' || filterType === 'monthly') {
          const todayAtMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
          currentLiveLogs = allFilteredLogs.filter(log => {
            const logDate = new Date(log.date_recorded);
            const logDayAtMidnight = new Date(logDate.getFullYear(), logDate.getMonth(), logDate.getDate()).getTime();
            return logDayAtMidnight <= todayAtMidnight;
          });
        } else if (filterType === 'semestral') {
          const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
          currentLiveLogs = allFilteredLogs.filter(log => {
            const logDate = new Date(log.date_recorded);
            const logMonthStart = new Date(logDate.getFullYear(), logDate.getMonth(), 1).getTime();
            return logMonthStart <= currentMonthStart;
          });
        } else {
          // Fallback for any other filter types if needed (though not currently defined)
          currentLiveLogs = allFilteredLogs;
        }

        // Now calculate counts from `currentLiveLogs` (which are time-filtered)
        totalViolationsCount.value = currentLiveLogs.length;
        settledViolationsCount.value = currentLiveLogs.filter(log => log.statusreal === true).length;
        unsettledViolationsCount.value = currentLiveLogs.filter(log => log.statusreal === false).length;

        const policyCounts = {};
        currentLiveLogs?.forEach(log => { // Iterate through currentLiveLogs
          const policyName = log.violation_categories?.name;
          if (policyName) {
            policyCounts[policyName] = (policyCounts[policyName] || 0) + 1;
          }
        });

        violatedPolicies.value = Object.entries(policyCounts).map(([policy, count]) => ({
          policy,
          count,
        }));
        violatedPolicies.value.sort((a, b) => b.count - a.count);

        // Fetch foot traffic data (this will also be filtered by time)
        const { data: footTrafficData, error: footTrafficError } = await supabase
          .from('foot_counts')
          .select('timestamp, count')
          .gte('timestamp', startDate.toISOString())
          .lte('timestamp', endDate.toISOString())
          .order('timestamp', { ascending: true });

        if (footTrafficError) throw footTrafficError;

        // The charts will then take these time-filtered logs and apply their own nulling logic
        // for future time points, ensuring consistency.
        updateCharts(currentLiveLogs, footTrafficData, filterType, startDate, endDate);

        console.log('Fetched and processed report data for:', filterType, {
          total: totalViolationsCount.value,
          settled: settledViolationsCount.value,
          unsettled: unsettledViolationsCount.value,
          policies: violatedPolicies.value,
          footTraffic: footTrafficData,
        });
      } catch (err) {
        console.error('Error fetching report data:', err);
        error.value = err.message;
      } finally {
        loading.value = false;
      }
    };

    // The rest of your script (prepareChartData, prepareFootTrafficChartData, updateCharts, etc.)
    // remains the same, as they are already set up to handle live data and the current time `now`.

    const prepareChartData = (logs, filterType, startDate, endDate) => {
      const counts = {};
      let labels = [];
      const now = new Date();

      if (filterType === 'daily') {
        labels = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`);
        logs.forEach(log => {
          const hour = new Date(log.date_recorded).getHours();
          const hourLabel = `${String(hour).padStart(2, '0')}:00`;
          counts[hourLabel] = (counts[hourLabel] || 0) + 1;
        });
      } else if (filterType === 'weekly') {
        const days = eachDayOfInterval({ start: startDate, end: endDate });
        labels = days.map(date => formatDate(date, 'EEE'));
        logs.forEach(log => {
          const day = formatDate(new Date(log.date_recorded), 'EEE');
          counts[day] = (counts[day] || 0) + 1;
        });
      } else if (filterType === 'monthly') {
        const days = eachDayOfInterval({ start: startDate, end: endDate });
        labels = days.map(date => formatDate(date, 'd'));
        logs.forEach(log => {
          const day = formatDate(new Date(log.date_recorded), 'd');
          counts[day] = (counts[day] || 0) + 1;
        });
      } else if (filterType === 'semestral') {
        const months = eachMonthOfInterval({ start: startDate, end: endDate });
        labels = months.map(date => formatDate(date, 'MMM'));
        logs.forEach(log => {
          const month = formatDate(new Date(log.date_recorded), 'MMM');
          counts[month] = (counts[month] || 0) + 1;
        });
      }

      let data;
      if (filterType === 'daily') {
        const currentHour = now.getHours();
        data = labels.map(label => {
          const hour = parseInt(label.split(':')[0]);
          return (hour > currentHour) ? null : (counts[label] || 0);
        });
      } else if (filterType === 'weekly' || filterType === 'monthly') {
        const intervals = eachDayOfInterval({ start: startDate, end: endDate });
        const todayAtMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

        data = labels.map((label, index) => {
          const labelDate = intervals[index];
          const labelDateAtMidnight = new Date(labelDate.getFullYear(), labelDate.getMonth(), labelDate.getDate()).getTime();

          if (labelDateAtMidnight > todayAtMidnight) {
            return null;
          }
          return counts[label] || 0;
        });
      } else if (filterType === 'semestral') {
        const intervals = eachMonthOfInterval({ start: startDate, end: endDate });
        const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

        data = labels.map((label, index) => {
          const labelDate = intervals[index];
          const labelMonthStart = new Date(labelDate.getFullYear(), labelDate.getMonth(), 1).getTime();

          if (labelMonthStart > currentMonthStart) {
            return null;
          }
          return counts[label] || 0;
        });
      } else {
          data = labels.map(label => counts[label] || 0);
      }

      return { labels, data };
    };

    const prepareFootTrafficChartData = (footTrafficData, filterType, startDate, endDate) => {
      const counts = {};
      let labels = [];
      const now = new Date();

      if (filterType === 'daily') {
        labels = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`);
        footTrafficData.forEach(item => {
          const hour = new Date(item.timestamp).getHours();
          const hourLabel = `${String(hour).padStart(2, '0')}:00`;
          counts[hourLabel] = (counts[hourLabel] || 0) + parseInt(item.count);
        });
      } else if (filterType === 'weekly') {
        const days = eachDayOfInterval({ start: startDate, end: endDate });
        labels = days.map(date => formatDate(date, 'EEE'));
        footTrafficData.forEach(item => {
          const day = formatDate(new Date(item.timestamp), 'EEE');
          counts[day] = (counts[day] || 0) + parseInt(item.count);
        });
      } else if (filterType === 'monthly') {
        const days = eachDayOfInterval({ start: startDate, end: endDate });
        labels = days.map(date => formatDate(date, 'd'));
        footTrafficData.forEach(item => {
          const day = formatDate(new Date(item.timestamp), 'd');
          counts[day] = (counts[day] || 0) + parseInt(item.count);
        });
      } else if (filterType === 'semestral') {
        const months = eachMonthOfInterval({ start: startDate, end: endDate });
        labels = months.map(date => formatDate(date, 'MMM'));
        footTrafficData.forEach(item => { // Corrected from `logs` to `footTrafficData`
          const month = formatDate(new Date(item.timestamp), 'MMM');
          counts[month] = (counts[month] || 0) + parseInt(item.count);
        });
      }

      let data;
      if (filterType === 'daily') {
        const currentHour = now.getHours();
        data = labels.map(label => {
          const hour = parseInt(label.split(':')[0]);
          return (hour > currentHour) ? null : (counts[label] || 0);
        });
      } else if (filterType === 'weekly' || filterType === 'monthly') {
        const intervals = eachDayOfInterval({ start: startDate, end: endDate });
        const todayAtMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

        data = labels.map((label, index) => {
          const labelDate = intervals[index];
          const labelDateAtMidnight = new Date(labelDate.getFullYear(), labelDate.getMonth(), labelDate.getDate()).getTime();

          if (labelDateAtMidnight > todayAtMidnight) {
            return null;
          }
          return counts[label] || 0;
        });
      } else if (filterType === 'semestral') {
        const intervals = eachMonthOfInterval({ start: startDate, end: endDate });
        const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

        data = labels.map((label, index) => {
          const labelDate = intervals[index];
          const labelMonthStart = new Date(labelDate.getFullYear(), labelDate.getMonth(), 1).getTime();

          if (labelMonthStart > currentMonthStart) {
            return null;
          }
          return counts[label] || 0;
        });
      } else {
          data = labels.map(label => counts[label] || 0);
      }

      return { labels, data };
    };

    const updateCharts = (violationLogs, footTrafficData, filterType, startDate, endDate) => {
      // Update Foot Traffic Chart
      const footTrafficChartData = prepareFootTrafficChartData(footTrafficData, filterType, startDate, endDate);

      if (footTrafficChartInstance.value) {
        footTrafficChartInstance.value.destroy();
      }

      const footTrafficCtx = document.getElementById('footTrafficChart');
      if (footTrafficCtx) {
        footTrafficChartInstance.value = new Chart(footTrafficCtx, {
          type: 'line',
          data: {
            labels: footTrafficChartData.labels,
            datasets: [{
              label: 'Foot Traffic Count',
              data: footTrafficChartData.data,
              borderColor: '#28a745',
              fill: false,
              tension: 0.1
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              y: {
                beginAtZero: true,
                title: {
                  display: true,
                  text: 'Foot Count'
                },
                ticks: {
                  precision: 0
                },
                grid: {
                  display: false
                }
              },
              x: {
                title: {
                  display: true,
                  text: filterType === 'daily' ? 'Hour (12 AM - 11 PM)' : filterType === 'weekly' ? 'Day' : filterType === 'monthly' ? 'Date' : 'Month'
                },
                grid: {
                  display: false
                }
              }
            },
            elements: {
              point: {
                radius: 3,
                hoverRadius: 5
              }
            }
          }
        });
      }

      // Update Total Violations Chart
      const totalViolationData = prepareChartData(violationLogs, filterType, startDate, endDate);

      if (totalViolationChartInstance.value) {
        totalViolationChartInstance.value.destroy();
      }

      const totalViolationCtx = document.getElementById('totalViolationChart');
      if (totalViolationCtx) {
        totalViolationChartInstance.value = new Chart(totalViolationCtx, {
          type: 'line',
          data: {
            labels: totalViolationData.labels,
            datasets: [{
              label: 'Total Number of Violations',
              data: totalViolationData.data,
              borderColor: '#007bff',
              fill: false,
              tension: 0.1
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              y: {
                beginAtZero: true,
                title: {
                  display: true,
                  text: 'Total Violations'
                },
                ticks: {
                  precision: 0
                },
                grid: {
                  display: false
                }
              },
              x: {
                title: {
                  display: true,
                  text: filterType === 'daily' ? 'Hour (12 AM - 11 PM)' : filterType === 'weekly' ? 'Day' : filterType === 'monthly' ? 'Date' : 'Month'
                },
                grid: {
                  display: false
                }
              }
            },
            elements: {
              point: {
                radius: 3,
                hoverRadius: 5
              }
            }
          }
        });
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
      return '';
    };

    watch(sortBy, (newSortBy) => {
      fetchReportData(newSortBy);
    });

    onMounted(() => {
      fetchReportData();
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
      footTrafficChartInstance,
      totalViolationChartInstance,
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
  font-size: 1.5em;
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
  cursor: pointer;
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
  gap: 2;
  text-align: center;
  align-items: center;
  justify-content: space-around;
  border: none;
  background-color: transparent;
  padding: 0;
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
  overflow: hidden;
}

.progress {
  height: 100%;
  border-radius: 4px;
  background-color: #ffc107;
}

.settled-violations,
.unsettled-violations {
  padding: 40px;
  border-radius: 5px;
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
  height: 300px;
  overflow: hidden;
}

.foot-traffic-chart-card h2,
.total-violations-chart-card h2 {
  margin-top: 0;
  margin-bottom: 15px;
  color: #333;
  font-size: 18px;
}

#footTrafficChart,
#totalViolationChart {
  width: 100%;
  height: 80%;
}

.chart-placeholder {
  height: 192px;
  display: flex;
  justify-content: center;
  align-items: center;
  color: #ccc;
  font-style: italic;
  width: 100%;
}
</style>
