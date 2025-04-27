<template>
  <div class="reports-container">
    <div class="reports-header">
      <h1 style="font-size: xx-large;">Reports</h1>
      <div class="actions">
        <div class="sort-by">
          <span>Sort by:</span>
          <select v-model="sortBy">
            <option value="newest">Daily</option>
            <option value="oldest">Weekly</option>
            <option value="oldest">Monthly</option>
            <option value="oldest">Semestral</option>
          </select>
        </div>
      </div>
    </div>
    <div class="reports-content">

      <div class="report-summary">
        <div class="most-violated-policy-card">
          <h2>Most Violated Policy</h2>
          <ul>
            <li>
              <img src="@/assets/unifvio.png" alt="Uniform Icon" class="policy-icon">
              <span class="policy-name">Uniform Infraction</span>
              <span class="count">Count: {{ uniformInfractionCount }}</span>
              <div class="progress-bar">
                <div class="progress" :style="{ width: uniformInfractionPercentage, backgroundColor: '#ffc107' }"></div>
              </div>
            </li>
            <li>
              <img src="@/assets/idvio.png" alt="ID Icon" class="policy-icon">
              <span class="policy-name">Missing ID</span>
              <span class="count">Count: {{ missingIdCount }}</span>
              <div class="progress-bar">
                <div class="progress" :style="{ width: missingIdPercentage, backgroundColor: '#ffc107' }"></div>
              </div>
            </li>
            <li>
              <img src="@/assets/civivio.png" alt="Civilian Attire Icon" class="policy-icon">
              <span class="policy-name">Civilian Attire</span>
              <span class="count">Count: {{ civilianAttireCount }}</span>
              <div class="progress-bar">
                <div class="progress" :style="{ width: civilianAttirePercentage, backgroundColor: '#ffc107' }"></div>
              </div>
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
          </div>
        </div>

        <div class="total-violations-chart-card">
          <h2>Total Violation</h2>
          <div class="chart-placeholder">
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue';

export default {
  setup() {
    const sortBy = ref('daily');

    const violationData = ref([
      { policy: 'Uniform Infraction', count: 27 },
      { policy: 'Missing ID', count: 24 },
      { policy: 'Civilian Attire', count: 17 },
    ]);

    const settledViolationsCount = ref(31);
    const unsettledViolationsCount = ref(37);

    const totalViolations = computed(() => settledViolationsCount.value + unsettledViolationsCount.value);

    const uniformInfractionCount = computed(() => violationData.value.find(item => item.policy === 'Uniform Infraction')?.count || 0);
    const missingIdCount = computed(() => violationData.value.find(item => item.policy === 'Missing ID')?.count || 0);
    const civilianAttireCount = computed(() => violationData.value.find(item => item.policy === 'Civilian Attire')?.count || 0);

    const uniformInfractionPercentage = computed(() => totalViolations.value > 0 ? (uniformInfractionCount.value / totalViolations.value) * 100 + '%' : '0%');
    const missingIdPercentage = computed(() => totalViolations.value > 0 ? (missingIdCount.value / totalViolations.value) * 100 + '%' : '0%');
    const civilianAttirePercentage = computed(() => totalViolations.value > 0 ? (civilianAttireCount.value / totalViolations.value) * 100 + '%' : '0%');

    const fetchReportData = async () => {
      await new Promise(resolve => setTimeout(resolve, 500));
      violationData.value = [
        { policy: 'Uniform Infraction', count: 27 },
        { policy: 'Missing ID', count: 24 },
        { policy: 'Civilian Attire', count: 17 },
      ];
      settledViolationsCount.value = 31;
      unsettledViolationsCount.value = 37;
    };

    onMounted(() => {
      fetchReportData();
    });

    return {
      sortBy,
      violationData,
      settledViolationsCount,
      unsettledViolationsCount,
      totalViolations,
      uniformInfractionCount,
      missingIdCount,
      civilianAttireCount,
      uniformInfractionPercentage,
      missingIdPercentage,
      civilianAttirePercentage,
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
  justify-content: space-between; /* Align items along the horizontal axis */
  align-items: center; /* Vertically align items in the center */
  margin-bottom: 20px;
  padding-left: 20px;
  padding-right: 20px; /* Add some right padding for spacing */
}

.reports-header h1 {
  margin: 0;
  color: #333;
  font-size: 16px; /* Adjusted font size to 16px */
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
}

.reports-content {
  flex-grow: 1;
}

.report-summary {
  display: grid;
  grid-template-columns: 1fr 1fr; /* Two equal columns */
  gap: 20px;
  margin-bottom: 20px;
  padding: 0 20px;
}

.most-violated-policy-card,
.violation-counts-card {
  background-color: #fff;
  border: 1px solid #eee;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
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
  display: flex;
  align-items: center;
  margin-bottom: 15px;
}

.policy-icon {
  width: 20px;
  height: 20px;
  margin-right: 10px;
  vertical-align: middle;
}

.policy-name {
  flex-grow: 1;
  color: #555;
  font-size: 14px;
}

.count {
  margin-left: 10px;
  color: #777;
  font-size: 14px;
}

.progress-bar {
  background-color: #f8f8f8;
  border-radius: 4px;
  height: 8px;
  width: 100px;
  margin-left: 10px;
  overflow: hidden;
}

.progress {
  height: 100%;
  border-radius: 4px;
  background-color: #ffc107;
}

.violation-counts-card {
  display: flex;
  gap: 20px;
  text-align: center;
  align-items: center;
  justify-content: space-around;
}

.settled-violations,
.unsettled-violations {
  padding: 15px;
  border-radius: 8px;
  font-size: x-large;
  border: 1px solid #ddd;
  background-color: #f9f9f9;
}

.violation-counts-card h2 {
  font-size: 16px;
  color: #555;
  margin-bottom: 5px;
}

.violation-counts-card .count {
  font-size: 3.0em;
  font-weight: bold;
  color: #ff9800;
  margin-top: 5px;
  margin-bottom: 5px;
}

/* Report Charts Section */
.report-charts {
  display: flex;
  flex-direction: column; /* Stack the chart cards */
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