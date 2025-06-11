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
              <span class="date">{{ formatDate(notification.created_at) }}</span>;
            </p>
          </template>
          <template v-else-if="notification.type === 'overdue'">
            <p class="overdue">
              <span class="user-name">{{ notification.students?.student_name }}</span> has an overdue violation
              <span class="violation">{{ notification.violation_categories?.name }}</span> from
              <span class="date">{{ formatDate(notification.created_at) }}</span> that remains unsettled;
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
import moment from 'moment-timezone'; // Correctly import moment-timezone
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
      // For displaying, we still want to interpret the timestamp as PHT
      return date ? moment.tz(date, 'Asia/Manila').format('YYYY-MM-DD h:mm:ss A') : '';
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
        // FIX: Define "today" in 'Asia/Manila' and format as timezone-agnostic strings for querying `timestamp` columns
        const nowManila = moment().tz('Asia/Manila');
        const startOfTodayManila = nowManila.clone().startOf('day');
        const endOfTodayManila = nowManila.clone().endOf('day');

        // Format to 'YYYY-MM-DD HH:mm:ss' which is what `timestamp` columns effectively use for comparison
        const startTimestampString = startOfTodayManila.format('YYYY-MM-DD HH:mm:ss');
        const endTimestampString = endOfTodayManila.format('YYYY-MM-DD HH:mm:ss');

        console.log('--- Fetching Notifications Debug Info (Fixed Select Parameter) ---');
        console.log('Manila Current Time:', nowManila.format());
        console.log('Manila Start of Day:', startOfTodayManila.format());
        console.log('Manila End of Day:', endOfTodayManila.format());
        console.log('Supabase Query Range (Timestamp Strings):');
        console.log('  startTimestampString:', startTimestampString);
        console.log('  endTimestampString:', endTimestampString);

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
            ),
            due_date
          `)
          .or( // Use the timezone-agnostic strings for comparison with `timestamp` columns
            `and(date_recorded.gte.${startTimestampString},date_recorded.lte.${endTimestampString}),` +
            `and(date_settled.gte.${startTimestampString},date_settled.lte.${endTimestampString}),` +
            `and(due_date.gte.${startTimestampString},due_date.lte.${endTimestampString},statusreal.eq.false)`
          )
          .order('date_recorded', { ascending: false }); // Order by recorded date for initial fetch

        if (fetchError) {
          console.error('Supabase fetch error:', fetchError.message);
          error.value = fetchError.message;
        } else {
          console.log('Supabase returned data:', data);
          const generatedNotifications = [];
          data.forEach(log => {
            // For logical checks, convert the fetched timestamp strings (which are naive) to Moment objects
            // and explicitly tell moment-timezone to interpret them as PHT.
            const recordedDateMoment = log.date_recorded ? moment.tz(log.date_recorded, 'Asia/Manila') : null;
            const settledDateMoment = log.date_settled ? moment.tz(log.date_settled, 'Asia/Manila') : null;
            const dueDateMoment = log.due_date ? moment.tz(log.due_date, 'Asia/Manila') : null;

            if (!recordedDateMoment) {
                console.warn('Skipping log due to missing date_recorded:', log);
                return; // Skip logs without a recorded date
            }

            const isRecordedToday = recordedDateMoment.isBetween(startOfTodayManila, endOfTodayManila, null, '[]');
            const isSettledToday = settledDateMoment && settledDateMoment.isBetween(startOfTodayManila, endOfTodayManila, null, '[]');
            const isDueTodayAndUnsettled = dueDateMoment && dueDateMoment.isBetween(startOfTodayManila, endOfTodayManila, null, '[]') && !log.statusreal;

            console.log('--- Processing Log Item ---');
            console.log('  Log Data:', log);
            console.log('  Recorded Date (PHT):', recordedDateMoment.format());
            console.log('  Is Recorded Today:', isRecordedToday);
            console.log('  Settled Date (PHT):', settledDateMoment ? settledDateMoment.format() : 'N/A');
            console.log('  Is Settled Today:', isSettledToday);
            console.log('  Due Date (PHT):', dueDateMoment ? dueDateMoment.format() : 'N/A');
            console.log('  Is Due Today & Unsettled:', isDueTodayAndUnsettled);


            // 1. Create the 'violation' notification if recorded today
            if (isRecordedToday) {
                generatedNotifications.push({
                    id: log.id, // Use the original log ID for this notification
                    type: 'violation',
                    created_at: log.date_recorded, // The timestamp of the initial violation (naive string)
                    students: log.students,
                    violation_categories: log.violation_categories,
                    is_read: !!log.statusreal, // This "violation" notification is 'read' if its statusreal is true (i.e., settled)
                    statusreal: log.statusreal, // Keep original statusreal for this entry
                    date_recorded: log.date_recorded // Add date_recorded for overdue message template
                });
            }

            // 2. If the violation is settled, create a separate 'settled' notification
            if (log.statusreal && isSettledToday) {
              generatedNotifications.push({
                id: `${log.id}-settled`, // Unique ID for the settled event notification
                type: 'settled',
                created_at: log.date_settled, // The timestamp of the settlement (naive string)
                students: log.students,
                violation_categories: log.violation_categories,
                is_read: true, // A settled notification is inherently "read"
                statusreal: log.statusreal, // Redundant but harmless for this type
                date_recorded: log.date_recorded // Add date_recorded for consistency, though not used in settled message
              });
            }

            // 3. If the violation is overdue and its due_date is today
            if (isDueTodayAndUnsettled) {
                const alreadyAddedAsViolation = generatedNotifications.some(n => n.id === log.id && n.type === 'violation');
                const alreadyAddedAsSettled = generatedNotifications.some(n => n.id === `${log.id}-settled` && n.type === 'settled');
                if (!alreadyAddedAsViolation && !alreadyAddedAsSettled) { // Only add if not already covered by a new violation or settled notification
                    generatedNotifications.push({
                        id: `${log.id}-overdue`, // Unique ID for overdue event
                        type: 'overdue',
                        created_at: log.date_recorded, // Use original recorded date for overdue notification display (naive string)
                        students: log.students,
                        violation_categories: log.violation_categories,
                        is_read: false, // Overdue is by definition not settled
                        statusreal: log.statusreal,
                        date_recorded: log.date_recorded // Add date_recorded for overdue message template
                    });
                }
            }
          });
          console.log('Final generatedNotifications array:', generatedNotifications);
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
            fetchNotifications();
          }
        )
        .on('postgres_changes', { event: '*', schema: 'public', table: 'foot_counts' }, async payload => {
          console.log('Foot count change detected:', payload);
          // For now, no dashboard counts needed here as this is notification page
        })
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
      }, 1000); // Countdown interval should be 1 second
    };

    const manualRefresh = () => {
      fetchNotifications(); // Just fetch new data
      refreshCountdown.value = 5; // Reset countdown for the visual timer
    };

    onMounted(() => {
      fetchNotifications();
      subscribeToActivityLogs();
      setupAutoRefresh();
    });

    onUnmounted(() => {
      if (supabaseSubscription) {
        supabase.removeChannel(supabaseSubscription);
      }
      if (refreshInterval) clearInterval(refreshInterval);
      if (countdownInterval) clearInterval(countdownInterval);
    });

    // --- Placeholder/Empty Methods for Dashboard Counts to avoid console errors ---
    // These are present to make the component self-contained for testing,
    // but in a real app, you'd likely use a shared store or mixin.
    const totalFootCount = ref(0);
    const newViolationCount = ref(0);
    const activityLogsForDashboardCounts = ref([]); // Needed for calculating dashboard counts
    const unsettledViolationCountToday = computed(() => {
        const startOfTodayPHT = moment().tz('Asia/Manila').startOf('day');
        const endOfTodayPHT = moment().tz('Asia/Manila').endOf('day');

        return activityLogsForDashboardCounts.value.filter(log => {
            const recordedDatePHT = moment.tz(log.date_recorded, 'Asia/Manila');
            return !log.statusreal && recordedDatePHT.isBetween(startOfTodayPHT, endOfTodayPHT, null, '[]');
        }).length;
    });

    // Stubbed functions for dashboard counts, as they are not the primary focus here
    const fetchCurrentDayFootCount = async () => {
      // This implementation needs to fetch 'foot_counts' from Supabase
      // and update `totalFootCount.value`
       try {
        const nowManila = moment().tz('Asia/Manila');
        const startOfTodayManila = nowManila.clone().startOf('day').add(1, 'minute');
        const endOfTodayManila = nowManila.clone().endOf('day').subtract(1, 'second');

        const startISO = startOfTodayManila.toISOString();
        const endISO = endOfTodayManila.toISOString();

        const { data, error } = await supabase
          .from('foot_counts')
          .select('count')
          .gte('timestamp', startISO)
          .lte('timestamp', endISO);

        if (error) {
          console.error('Error fetching current day foot count:', error);
        } else {
          totalFootCount.value = data.reduce((sum, item) => sum + item.count, 0);
        }
      } catch (err) {
        console.error('Unexpected error fetching foot count:', err);
      }
    };

    const fetchActivityLogsForDashboardCounts = async () => {
      // This implementation needs to fetch relevant 'activity_logs' from Supabase
      // and update `activityLogsForDashboardCounts.value` and `newViolationCount.value`
       try {
            const { data, error } = await supabase
                .from('activity_logs')
                .select('id, date_recorded, statusreal');

            if (error) {
                console.error('Error fetching activity logs for dashboard counts:', error);
            } else {
                activityLogsForDashboardCounts.value = data;
                calculateDashboardCounts();
            }
        } catch (err) {
            console.error('Unexpected error fetching activity logs for dashboard counts:', err);
        }
    };

    const calculateDashboardCounts = () => {
        const startOfTodayPHT = moment().tz('Asia/Manila').startOf('day');
        const endOfTodayPHT = moment().tz('Asia/Manila').endOf('day');

        newViolationCount.value = activityLogsForDashboardCounts.value.filter(log => {
            const recordedDatePHT = moment.tz(log.date_recorded, 'Asia/Manila');
            return recordedDatePHT.isBetween(startOfTodayPHT, endOfTodayPHT, null, '[]');
        }).length;
    };
    // --- End of Placeholder/Empty Methods ---


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
      manualRefresh,
      // Dashboard counts
      totalFootCount,
      newViolationCount,
      unsettledViolationCountToday,
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

.notification-actions button {
  padding: 8px 12px;
  border: 1px solid #ccc;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9em;
  margin-left: 5px;
}
</style>
