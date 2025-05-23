<template>
  <div class="notifications-container">
    <div class="notifications-header">
      <h1>Student Violations</h1>
      <div class="actions">
        <div class="search-bar">
          <input type="text" placeholder="Search" v-model="searchQuery" />
        </div>
        <div class="header-controls">
          <div class="sort-by">
            <span>Sort by:</span>
            <select v-model="sortBy">
              <option value="date_recorded_desc">Newest</option>
              <option value="date_recorded_asc">Oldest</option>
            </select>
          </div>
          <div class="refresh-info">
            <button @click="manualRefresh" class="refresh-button">Refresh Now</button>
          </div>
        </div>
      </div>
    </div>
    <ul class="notifications-list">
      <li
        v-for="notification in filteredNotifications"
        :key="notification.id"
        class="notification-item"
        :class="getNotificationClass(notification)"
      >
        <div class="notification-content">
          <template v-if="notification.type === 'violation'">
            <p>
              <span class="user-name">{{ notification.students?.student_name }}</span> has violated
              <span class="violation">{{ notification.violation_categories?.name }}</span> on
              <span class="date">{{ formatDate(notification.created_at) }}</span>;
            </p>
          </template>
          <template v-else-if="notification.type === 'settled'">
            <p>
              <span class="user-name">{{ notification.students?.student_name }}</span> has settled their violation
              regarding
              <span class="violation">{{ notification.violation_categories?.name }}</span> on
              <span class="date">{{ formatDate(notification.date_settled) }}.</span>
            </p>
          </template>
          <template v-else-if="notification.type === 'overdue'">
            <p class="overdue">
              <span class="user-name">{{ notification.students?.student_name }}</span> has an overdue violation from
              <span class="date">{{ formatDate(notification.date_recorded) }}</span> that remains unsettled;
            </p>
          </template>
          <template v-else>
            <p>Unknown notification type.</p>
          </template>
        </div>
      </li>
      <li v-if="filteredNotifications.length === 0 && !loading">
        <p class="empty-message">No notifications found.</p>
      </li>
      <li v-if="loading">
        <p class="loading-message">Loading notifications...</p>
      </li>
    </ul>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import moment from 'moment';
import supabase from '@/components/Supabase'; // Adjust the import path if needed

export default {
  setup() {
    const searchQuery = ref('');
    const sortBy = ref('date_recorded_desc'); // Default sort: will now effectively sort by `created_at`
    const notifications = ref([]);
    const loading = ref(false);
    const error = ref(null);
    const refreshCountdown = ref(5); // Adjusted for 5-second auto-refresh
    let refreshInterval = null;
    let countdownInterval = null;
    let supabaseSubscription = null; // Store the subscription object

    const filteredNotifications = computed(() => {
      let sortedNotifications = [...notifications.value];

      // Sort by the `created_at` property which now represents the event's timestamp
      if (sortBy.value === 'date_recorded_desc') { // "Newest"
        sortedNotifications.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      } else if (sortBy.value === 'date_recorded_asc') { // "Oldest"
        sortedNotifications.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      }

      return sortedNotifications.filter((notification) => {
        const searchTerm = searchQuery.value.toLowerCase();
        const studentName = notification.students?.student_name?.toLowerCase() || '';
        const violationName = notification.violation_categories?.name?.toLowerCase() || '';
        return (
          studentName.includes(searchTerm) ||
          violationName.includes(searchTerm)
        );
      });
    });

    const formatDate = (date) => {
      return date ? moment(date).utcOffset('+08:00').format('YYYY-MM-DD h:mm:ss A') : 'N/A';
    };

    const getNotificationClass = (notification) => {
      if (notification.type === 'settled') {
        return 'settled'; // Class for explicit "settled" event notifications
      } else if (notification.type === 'overdue') {
        return 'overdue'; // Class for overdue initial violations
      } else if (notification.type === 'violation') {
        // This is an initial violation notification
        if (notification.is_read) {
          return 'read'; // If the original violation has been handled (settled)
        }
        return 'new'; // If it's a new, unhandled violation
      }
      return ''; // Default or unknown type
    };

    const fetchNotifications = async () => {
      loading.value = true;
      error.value = null;
      try {
        // Calculate start and end of the current day in PHT (UTC+8)
        const today = new Date(); // This is a local Date object (PHT)
        const startOfDayPHT = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
        const endOfDayPHT = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

        // Convert to ISO strings for Supabase query
        const startISO = startOfDayPHT.toISOString();
        const endISO = endOfDayPHT.toISOString();

        console.log('Fetching notifications for PHT day:', startOfDayPHT, 'to', endOfDayPHT);

        const { data, error: fetchError } = await supabase
          .from('activity_logs')
          .select(`
            id,
            date_recorded,
            date_settled,
            statusreal,
            students (
              student_name
            ),
            violation_categories (
              name
            )
          `)
          .or( // This 'or' condition ensures we get records where EITHER date_recorded OR date_settled is today
            `and(date_recorded.gte.${startISO},date_recorded.lte.${endISO}),` +
            `and(date_settled.gte.${startISO},date_settled.lte.${endISO})`
          )
          .order('date_recorded', { ascending: false }); // Order by recorded date for initial fetch

        if (fetchError) {
          console.error('Error fetching activity logs:', fetchError);
          error.value = fetchError.message;
        } else {
          const generatedNotifications = [];
          data.forEach(log => {
            // 1. Create the 'violation' or 'overdue' notification
            // This represents the initial violation event.
            // Only add if the violation happened today OR it's overdue (which implicitly means it started before today)
            // But with the Supabase filter, it must have happened today to be included.
            // If it's settled today, but recorded yesterday, the 'violation' notification will show 'read' status.
            
            // Check if the original violation date is within today's range
            const recordedDateMoment = moment(log.date_recorded);
            const isRecordedToday = recordedDateMoment.isBetween(startOfDayPHT, endOfDayPHT, null, '[]'); // [] means inclusive

            // Only add the original violation if it was recorded today, or if it's settled today (to show its "read" state)
            // The Supabase query already handles records where recorded or settled is today.
            // So, just create the notification based on the log's original state.
            const isOverdue = !log.statusreal && log.date_recorded && moment().isAfter(moment(log.date_recorded).add(3, 'days'));
            
            // Ensure we don't add the original violation if it's past today AND settled today
            // The filter means it MUST be related to today anyway.
            if (isRecordedToday || (log.statusreal && moment(log.date_settled).isBetween(startOfDayPHT, endOfDayPHT, null, '[]'))) {
                generatedNotifications.push({
                    id: log.id, // Use the original log ID for this notification
                    type: isOverdue ? 'overdue' : 'violation',
                    created_at: log.date_recorded, // The timestamp of the initial violation
                    students: log.students,
                    violation_categories: log.violation_categories,
                    is_read: !!log.statusreal, // This "violation" notification is 'read' if its statusreal is true (i.e., settled)
                    statusreal: log.statusreal, // Keep original statusreal for this entry
                });
            }


            // 2. If the violation is settled, create a separate 'settled' notification
            // This notification will only be created if date_settled is within today's range (due to Supabase filter)
            if (log.statusreal && log.date_settled) {
              generatedNotifications.push({
                id: `${log.id}-settled`, // Unique ID for the settled event notification
                type: 'settled',
                created_at: log.date_settled, // The timestamp of the settlement
                students: log.students,
                violation_categories: log.violation_categories,
                is_read: true, // A settled notification is inherently "read"
                statusreal: log.statusreal, // Redundant but harmless for this type
              });
            }
          });
          // Assign the combined list to notifications. The computed property will then handle final sorting.
          notifications.value = generatedNotifications;
        }
      } catch (err) {
        console.error('Unexpected error fetching activity logs:', err);
        error.value = err.message;
      } finally {
        loading.value = false;
      }
    };

    const subscribeToActivityLogs = () => {
      // Unsubscribe from previous channel if it exists
      if (supabaseSubscription) {
        supabase.removeChannel(supabaseSubscription);
      }
      supabaseSubscription = supabase // Store the subscription
        .channel('activity_logs_changes_notifications') // Use a unique channel name
        .on('postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'activity_logs'
          },
          (payload) => {
            console.log('Real-time update received:', payload);
            // Refresh the data when any change happens to the activity_logs table
            fetchNotifications();
          }
        )
        .subscribe();
    };

    const setupAutoRefresh = () => {
      // Clear any existing intervals to prevent duplicates if called multiple times
      if (refreshInterval) clearInterval(refreshInterval);
      if (countdownInterval) clearInterval(countdownInterval);

      // Set up data refresh (calls fetchNotifications)
      refreshInterval = setInterval(() => {
        fetchNotifications(); // Refresh data, not the whole page
      }, 5000); // Refreshes data every 5 seconds

      // Set up countdown timer for display
      countdownInterval = setInterval(() => {
        refreshCountdown.value -= 1;
        if (refreshCountdown.value <= 0) {
          refreshCountdown.value = 5; // Reset countdown for the 5-second interval
        }
      }, 5000);
    };

    const manualRefresh = () => {
      fetchNotifications(); // Just fetch new data
      refreshCountdown.value = 5; // Reset countdown for the visual timer
    };

    onMounted(() => {
      fetchNotifications();
      subscribeToActivityLogs();
      setupAutoRefresh();

      // Clean up subscription and intervals when component is unmounted
      onUnmounted(() => {
        if (supabaseSubscription) {
          supabase.removeChannel(supabaseSubscription);
        }
        if (refreshInterval) clearInterval(refreshInterval);
        if (countdownInterval) clearInterval(countdownInterval);
      });
    });

    return {
      searchQuery,
      sortBy,
      notifications,
      filteredNotifications,
      formatDate,
      getNotificationClass,
      loading,
      error,
      refreshCountdown,
      manualRefresh
    };
  },
};
</script>

<style scoped>
/* Your existing styles (no changes needed here) */
.notifications-container {
  font-family: sans-serif;
  padding: 20px;
}

.notifications-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.notifications-header h1 {
  margin: 0;
}

.actions {
  display: flex;
  gap: 20px;
  align-items: center;
}

.search-bar input {
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
}

.header-controls {
  display: flex;
  gap: 20px;
  align-items: center;
}

.sort-by {
  display: flex;
  align-items: center;
  gap: 5px;
}

.sort-by select {
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
}

.refresh-info {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.9em;
}

.refresh-button {
  padding: 6px 12px;
  background-color: #f0f0f0;
  border: 1px solid #ccc;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9em;
  transition: background-color 0.2s;
}

.refresh-button:hover {
  background-color: #e0e0e0;
}

.notifications-list {
  list-style: none;
  padding: 0;
}

.notification-item {
  background-color: #f9f9f9;
  border: 1px solid #eee;
  border-radius: 4px;
  padding: 15px;
  margin-bottom: 10px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.notification-content {
  flex-grow: 1;
  margin-right: 10px;
}

.notification-item.new {
  border-left: 5px solid #007bff; /* Unsettled, not overdue */
}

.notification-item.settled {
  border-left: 5px solid #28a745; /* Explicit settled event */
  background-color: #e6ffe6; /* Lighter green background for settled event */
}

.notification-item.overdue {
  border-left: 5px solid #dc3545; /* Overdue initial violation */
}

.notification-item.read {
  /* This applies to the *original violation* notification once it's settled */
  background-color: #f0f0f0; /* Greyed out background */
  color: #777;
  border-left: 5px solid #ccc; /* Grey border for handled/read initial violations */
}

.notification-item.read .user-name,
.notification-item.read .violation {
  font-weight: normal;
  font-style: normal;
  color: #777;
}

.user-name {
  font-weight: bold;
}

.violation {
  font-style: italic;
}

.date {
  color: #777;
}

.empty-message {
  text-align: center;
  color: #999;
}

.loading-message {
  text-align: center;
  color: #999;
  padding: 15px;
}
</style>

<style scoped>
.notifications-container {
  font-family: sans-serif;
  padding: 20px;
}

.notifications-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.notifications-header h1 {
  margin: 0;
}

.actions {
  display: flex;
  gap: 20px;
  align-items: center;
}

.search-bar input {
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
}

.header-controls {
  display: flex;
  gap: 20px;
  align-items: center;
}

.mark-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.mark-actions select,
.mark-actions button {
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
  cursor: pointer;
}

.mark-actions button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.sort-by {
  display: flex;
  align-items: center;
  gap: 5px;
}

.sort-by select {
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
}

.refresh-info {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.9em;
}

.refresh-button {
  padding: 6px 12px;
  background-color: #f0f0f0;
  border: 1px solid #ccc;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9em;
  transition: background-color 0.2s;
}

.refresh-button:hover {
  background-color: #e0e0e0;
}

.notifications-list {
  list-style: none;
  padding: 0;
}

.notification-item {
  background-color: #f9f9f9;
  border: 1px solid #eee;
  border-radius: 4px;
  padding: 15px;
  margin-bottom: 10px;
  display: flex;
  justify-content: space-between;
  align-items: center; /* Align content and actions vertically */
}

.notification-content {
  flex-grow: 1; /* Allow content to take up more space */
  margin-right: 10px; /* Space between content and actions */
}

.notification-item.new {
  border-left: 5px solid #007bff; /* Example for new violations */
}

.notification-item.settled {
  border-left: 5px solid #28a745; /* Example for settled violations */
}

.notification-item.overdue {
  border-left: 5px solid #dc3545; /* Example for overdue violations */
}

.notification-item.read {
  background-color: #f0f0f0; /* Example styling for read notifications */
  color: #777;
}

.notification-item.read .user-name,
.notification-item.read .violation {
  font-weight: normal;
  font-style: normal;
  color: #777;
}

.user-name {
  font-weight: bold;
}

.violation {
  font-style: italic;
}

.date {
  color: #777;
}

.action-button {
  background: none;
  border: none;
  color: blue;
  cursor: pointer;
  padding: 0;
  text-decoration: underline;
}

.empty-message {
  text-align: center;
  color: #999;
}

.loading-message {
  text-align: center;
  color: #999;
  padding: 15px;
}

.notification-actions button {
  padding: 8px 12px;
  border: 1px solid #ccc;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9em;
  margin-left: 5px;
}


</style>
