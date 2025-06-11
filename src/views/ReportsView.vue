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
import { ref, onMounted, watch, onUnmounted } from 'vue';
import supabase from '@/components/Supabase'; // Adjust the import path if needed
import unifvioIcon from '@/assets/unifvio.png';
import idvioIcon from '@/assets/idvio.png';
import civivioIcon from '@/assets/civivio.png';
// Using date-fns for interval calculations, but Moment-timezone for exact date handling
import { eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval, format as formatDateFns } from 'date-fns';
import { Chart, registerables } from 'chart.js';
import moment from 'moment-timezone'; // Import moment-timezone

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

    let supabaseSubscriptionActivityLogs = null; // New ref for activity_logs subscription
    let supabaseSubscriptionFootCounts = null; // New ref for foot_counts subscription

    // Helper to format dates consistently for display (using moment-timezone)
    const formatDate = (date) => {
      // Assuming 'date' coming from Supabase is a naive timestamp string
      // Interpret it as PHT for display
      return date ? moment.tz(date, 'Asia/Manila').format('YYYY-MM-DD h:mm:ss A') : '';
    };

    const fetchReportData = async (filterType = sortBy.value) => {
      loading.value = true;
      error.value = null;
      try {
        // FIX: Use moment-timezone to define "today" in 'Asia/Manila' and format as timezone-agnostic strings for querying `timestamp` columns
        const nowManila = moment().tz('Asia/Manila');
        let startDateMoment, endDateMoment;

        if (filterType === 'daily') {
          startDateMoment = nowManila.clone().startOf('day');
          endDateMoment = nowManila.clone().endOf('day');
        } else if (filterType === 'weekly') {
          // Adjust for Monday-Saturday week as per user's previous logic
          // startOfWeek with weekStartsOn: 1 (Monday), then adjust endDate to Saturday
          startDateMoment = nowManila.clone().startOf('isoWeek'); // ISO week starts on Monday
          endDateMoment = startDateMoment.clone().add(5, 'days').endOf('day'); // End of Saturday
        } else if (filterType === 'monthly') {
          startDateMoment = nowManila.clone().startOf('month');
          endDateMoment = nowManila.clone().endOf('month');
        } else if (filterType === 'semestral') {
          const currentMonth = nowManila.month(); // 0-indexed month
          if (currentMonth >= 0 && currentMonth <= 4) { // January (0) to May (4)
            startDateMoment = nowManila.clone().month(0).startOf('month'); // January 1st
            endDateMoment = nowManila.clone().month(4).endOf('month');   // May 31st
          } else { // August (7) to December (11)
            startDateMoment = nowManila.clone().month(7).startOf('month'); // August 1st
            endDateMoment = nowManila.clone().month(11).endOf('month'); // December 31st
          }
        }

        // Format to 'YYYY-MM-DD HH:mm:ss' which is what `timestamp` columns effectively use for comparison
        const startTimestampString = startDateMoment.format('YYYY-MM-DD HH:mm:ss');
        const endTimestampString = endDateMoment.format('YYYY-MM-DD HH:mm:ss');

        console.log('--- Fetching Report Data Debug Info ---');
        console.log('Filter Type:', filterType);
        console.log('Manila Period Start:', startDateMoment.format());
        console.log('Manila Period End:', endDateMoment.format());
        console.log('Supabase Query Range (Timestamp Strings):');
        console.log('  startTimestampString:', startTimestampString);
        console.log('  endTimestampString:', endTimestampString);

        // Fetch violation logs from Supabase for the entire period
        const { data: allFilteredLogs, error: filteredLogsError } = await supabase
          .from('activity_logs')
          .select('date_recorded, violation_categories(name), statusreal')
          .gte('date_recorded', startTimestampString) // Use timezone-agnostic strings
          .lte('date_recorded', endTimestampString); // Use timezone-agnostic strings

        if (filteredLogsError) throw filteredLogsError;
        console.log('Raw activity_logs data from Supabase:', allFilteredLogs);


        // Apply "live" filtering to the logs based on current time BEFORE calculating counts
        let currentLiveLogs = [];
        const now = moment().tz('Asia/Manila'); // Current local time for "live" cut-off

        if (filterType === 'daily') {
          currentLiveLogs = allFilteredLogs.filter(log => {
            const logDateMoment = moment.tz(log.date_recorded, 'Asia/Manila');
            // Only include logs up to the current hour (inclusive)
            return logDateMoment.hours() <= now.hours();
          });
        } else if (filterType === 'weekly' || filterType === 'monthly') {
          currentLiveLogs = allFilteredLogs.filter(log => {
            const logDateMoment = moment.tz(log.date_recorded, 'Asia/Manila');
            // Only include logs up to the current day (inclusive)
            return logDateMoment.isSameOrBefore(now, 'day');
          });
        } else if (filterType === 'semestral') {
          currentLiveLogs = allFilteredLogs.filter(log => {
            const logDateMoment = moment.tz(log.date_recorded, 'Asia/Manila');
            // Only include logs up to the current month (inclusive)
            return logDateMoment.isSameOrBefore(now, 'month');
          });
        } else {
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
          .gte('timestamp', startTimestampString) // Use timezone-agnostic strings
          .lte('timestamp', endTimestampString)   // Use timezone-agnostic strings
          .order('timestamp', { ascending: true });

        if (footTrafficError) throw footTrafficError;
        console.log('Raw foot_counts data from Supabase:', footTrafficData);

        // The charts will then take these time-filtered logs and apply their own nulling logic
        // for future time points, ensuring consistency.
        updateCharts(currentLiveLogs, footTrafficData, filterType, startDateMoment, endDateMoment); // Pass Moment objects

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

    const prepareChartData = (logs, filterType, startDateMoment, endDateMoment) => {
      const counts = {};
      let labels = [];
      const now = moment().tz('Asia/Manila');

      if (filterType === 'daily') {
        labels = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`);
        logs.forEach(log => {
          const hour = moment.tz(log.date_recorded, 'Asia/Manila').hours();
          const hourLabel = `${String(hour).padStart(2, '0')}:00`;
          counts[hourLabel] = (counts[hourLabel] || 0) + 1;
        });
      } else if (filterType === 'weekly') {
        const days = eachDayOfInterval({ start: startDateMoment.toDate(), end: endDateMoment.toDate() });
        labels = days.map(date => formatDateFns(date, 'EEE'));
        logs.forEach(log => {
          const day = formatDateFns(moment.tz(log.date_recorded, 'Asia/Manila').toDate(), 'EEE');
          counts[day] = (counts[day] || 0) + 1;
        });
      } else if (filterType === 'monthly') {
        const days = eachDayOfInterval({ start: startDateMoment.toDate(), end: endDateMoment.toDate() });
        labels = days.map(date => formatDateFns(date, 'd'));
        logs.forEach(log => {
          const day = formatDateFns(moment.tz(log.date_recorded, 'Asia/Manila').toDate(), 'd');
          counts[day] = (counts[day] || 0) + 1;
        });
      } else if (filterType === 'semestral') {
        const months = eachMonthOfInterval({ start: startDateMoment.toDate(), end: endDateMoment.toDate() });
        labels = months.map(date => formatDateFns(date, 'MMM'));
        logs.forEach(log => {
          const month = formatDateFns(moment.tz(log.date_recorded, 'Asia/Manila').toDate(), 'MMM');
          counts[month] = (counts[month] || 0) + 1;
        });
      }

      let data;
      if (filterType === 'daily') {
        const currentHour = now.hours(); // Use moment.hours()
        data = labels.map(label => {
          const hour = parseInt(label.split(':')[0]);
          return (hour > currentHour) ? null : (counts[label] || 0);
        });
      } else if (filterType === 'weekly' || filterType === 'monthly') {
        const intervals = eachDayOfInterval({ start: startDateMoment.toDate(), end: endDateMoment.toDate() });
        const todayAtMidnight = now.clone().startOf('day'); // Use moment for comparison

        data = labels.map((label, index) => {
          const labelDate = moment(intervals[index]).tz('Asia/Manila').startOf('day');
          if (labelDate.isAfter(todayAtMidnight)) {
            return null;
          }
          return counts[label] || 0;
        });
      } else if (filterType === 'semestral') {
        const intervals = eachMonthOfInterval({ start: startDateMoment.toDate(), end: endDateMoment.toDate() });
        const currentMonthStart = now.clone().startOf('month'); // Use moment for comparison

        data = labels.map((label, index) => {
          const labelDate = moment(intervals[index]).tz('Asia/Manila').startOf('month');
          if (labelDate.isAfter(currentMonthStart)) {
            return null;
          }
          return counts[label] || 0;
        });
      } else {
          data = labels.map(label => counts[label] || 0);
      }

      return { labels, data };
    };

    const prepareFootTrafficChartData = (footTrafficData, filterType, startDateMoment, endDateMoment) => {
      const counts = {};
      let labels = [];
      const now = moment().tz('Asia/Manila');

      if (filterType === 'daily') {
        labels = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`);
        footTrafficData.forEach(item => {
          const hour = moment.tz(item.timestamp, 'Asia/Manila').hours();
          const hourLabel = `${String(hour).padStart(2, '0')}:00`;
          counts[hourLabel] = (counts[hourLabel] || 0) + parseInt(item.count);
        });
      } else if (filterType === 'weekly') {
        const days = eachDayOfInterval({ start: startDateMoment.toDate(), end: endDateMoment.toDate() });
        labels = days.map(date => formatDateFns(date, 'EEE'));
        footTrafficData.forEach(item => {
          const day = formatDateFns(moment.tz(item.timestamp, 'Asia/Manila').toDate(), 'EEE');
          counts[day] = (counts[day] || 0) + parseInt(item.count);
        });
      } else if (filterType === 'monthly') {
        const days = eachDayOfInterval({ start: startDateMoment.toDate(), end: endDateMoment.toDate() });
        labels = days.map(date => formatDateFns(date, 'd'));
        footTrafficData.forEach(item => {
          const day = formatDateFns(moment.tz(item.timestamp, 'Asia/Manila').toDate(), 'd');
          counts[day] = (counts[day] || 0) + parseInt(item.count);
        });
      } else if (filterType === 'semestral') {
        const months = eachMonthOfInterval({ start: startDateMoment.toDate(), end: endDateMoment.toDate() });
        labels = months.map(date => formatDateFns(date, 'MMM'));
        footTrafficData.forEach(item => { // Corrected from `logs` to `footTrafficData`
          const month = formatDateFns(moment.tz(item.timestamp, 'Asia/Manila').toDate(), 'MMM');
          counts[month] = (counts[month] || 0) + parseInt(item.count);
        });
      }

      let data;
      if (filterType === 'daily') {
        const currentHour = now.hours();
        data = labels.map(label => {
          const hour = parseInt(label.split(':')[0]);
          return (hour > currentHour) ? null : (counts[label] || 0);
        });
      } else if (filterType === 'weekly' || filterType === 'monthly') {
        const intervals = eachDayOfInterval({ start: startDateMoment.toDate(), end: endDateMoment.toDate() });
        const todayAtMidnight = now.clone().startOf('day');

        data = labels.map((label, index) => {
          const labelDate = moment(intervals[index]).tz('Asia/Manila').startOf('day');
          if (labelDate.isAfter(todayAtMidnight)) {
            return null;
          }
          return counts[label] || 0;
        });
      } else if (filterType === 'semestral') {
        const intervals = eachMonthOfInterval({ start: startDateMoment.toDate(), end: endDateMoment.toDate() });
        const currentMonthStart = now.clone().startOf('month');

        data = labels.map((label, index) => {
          const labelDate = moment(intervals[index]).tz('Asia/Manila').startOf('month');
          if (labelDate.isAfter(currentMonthStart)) {
            return null;
          }
          return counts[label] || 0;
        });
      } else {
          data = labels.map(label => counts[label] || 0);
      }

      return { labels, data };
    };

    const updateCharts = (violationLogs, footTrafficData, filterType, startDateMoment, endDateMoment) => {
      // Update Foot Traffic Chart
      const footTrafficChartData = prepareFootTrafficChartData(footTrafficData, filterType, startDateMoment, endDateMoment);

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
      const totalViolationData = prepareChartData(violationLogs, filterType, startDateMoment, endDateMoment);

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

    // Realtime Subscription Setup
    const setupRealtimeSubscriptions = () => {
      // Clear existing subscriptions to avoid duplicates
      if (supabaseSubscriptionActivityLogs) {
        supabase.removeChannel(supabaseSubscriptionActivityLogs);
      }
      if (supabaseSubscriptionFootCounts) {
        supabase.removeChannel(supabaseSubscriptionFootCounts);
      }

      // Subscribe to activity_logs changes
      supabaseSubscriptionActivityLogs = supabase
        .channel('reports_activity_logs_channel')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'activity_logs' }, payload => {
          console.log('Realtime change in activity_logs detected:', payload);
          fetchReportData(); // Re-fetch all report data
        })
        .subscribe();

      // Subscribe to foot_counts changes
      supabaseSubscriptionFootCounts = supabase
        .channel('reports_foot_counts_channel')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'foot_counts' }, payload => {
          console.log('Realtime change in foot_counts detected:', payload);
          fetchReportData(); // Re-fetch all report data
        })
        .subscribe();
    };


    watch(sortBy, (newSortBy) => {
      fetchReportData(newSortBy);
    });

    onMounted(() => {
      fetchReportData(); // Initial data fetch
      setupRealtimeSubscriptions(); // Setup real-time listeners
    });

    onUnmounted(() => {
      if (supabaseSubscriptionActivityLogs) {
        supabase.removeChannel(supabaseSubscriptionActivityLogs);
      }
      if (supabaseSubscriptionFootCounts) {
        supabase.removeChannel(supabaseSubscriptionFootCounts);
      }
      if (footTrafficChartInstance.value) {
        footTrafficChartInstance.value.destroy();
      }
      if (totalViolationChartInstance.value) {
        totalViolationChartInstance.value.destroy();
      }
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
      // Chart instances are managed internally, no need to expose directly
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
  gap: 20px; /* Adjusted gap for better spacing */
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
  flex: 1; /* Make them take equal width */
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
  position: relative; /* For canvas sizing */
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
  width: 100% !important; /* Ensure canvas takes full width of parent */
  height: 100% !important; /* Ensure canvas takes full height of parent */
  max-height: 250px; /* Limit max height to prevent excessive stretching */
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
