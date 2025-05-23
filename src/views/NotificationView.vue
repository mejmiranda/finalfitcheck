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
            <span>Refreshing in: {{ refreshCountdown }}s</span>
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
    const sortBy = ref('date_recorded_desc'); // Default sort
    const bulkAction = ref('');
    const notifications = ref([]);
    const loading = ref(false);
    const error = ref(null);
    const refreshCountdown = ref(10);
    let refreshInterval = null;
    let countdownInterval = null;

    const filteredNotifications = computed(() => {
      let sortedNotifications = [...notifications.value];

      if (sortBy.value === 'date_recorded_desc') {
        sortedNotifications.sort((a, b) => new Date(b.date_recorded || b.date_settled || b.created_at) - new Date(a.date_recorded || a.date_settled || a.created_at));
      } else if (sortBy.value === 'date_recorded_asc') {
        sortedNotifications.sort((a, b) => new Date(a.date_recorded || a.date_settled || a.created_at) - new Date(b.date_recorded || b.date_settled || b.created_at));
      } else if (sortBy.value === 'is_read_asc') {
        sortedNotifications.sort((a, b) => (a.is_read ? 1 : -1) - (b.is_read ? 1 : -1));
      } else if (sortBy.value === 'is_read_desc') {
        sortedNotifications.sort((a, b) => (a.is_read ? -1 : 1) - (b.is_read ? -1 : 1));
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
      if (!notification.statusreal && notification.date_recorded) {
        const threeDaysAfterRecord = moment(notification.date_recorded).add(3, 'days');
        if (moment().isAfter(threeDaysAfterRecord)) {
          return 'overdue';
        }
        return 'new'; // Consider as new if not settled and not overdue
      } else if (notification.statusreal && notification.date_settled) {
        return 'settled';
      } else if (notification.is_read) {
        return 'read';
      }
      return '';
    };

    const fetchNotifications = async () => {
      loading.value = true;
      error.value = null;
      try {
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
          .order('date_recorded', { ascending: false });

        if (fetchError) {
          console.error('Error fetching activity logs:', fetchError);
          error.value = fetchError.message;
        } else {
          notifications.value = data.map(log => ({
            id: log.id,
            type: log.statusreal && log.date_settled ? 'settled' : (!log.statusreal && log.date_recorded && moment().isAfter(moment(log.date_recorded).add(3, 'days')) ? 'overdue' : 'violation'),
            created_at: log.date_recorded,
            date_settled: log.date_settled,
            date_recorded: log.date_recorded,
            students: log.students,
            violation_categories: log.violation_categories,
            is_read: !!(log.statusreal && log.date_settled),
            statusreal: log.statusreal,
          }));
        }
      } catch (err) {
        console.error('Unexpected error fetching activity logs:', err);
        error.value = err.message;
      } finally {
        loading.value = false;
      }
    };

    const subscribeToActivityLogs = () => {
      const subscription = supabase
        .channel('activity_logs_changes')
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

      // Return the subscription for cleanup
      return subscription;
    };

    const setupAutoRefresh = () => {
      // Set up page refresh every 10 seconds
      refreshInterval = setInterval(() => {
        window.location.reload();
      }, 10000);

      // Set up countdown timer
      countdownInterval = setInterval(() => {
        refreshCountdown.value -= 1;
        if (refreshCountdown.value <= 0) {
          refreshCountdown.value = 10;
        }
      }, 1000);
    };

    const manualRefresh = () => {
      window.location.reload();
    };

    const markAsRead = async (id) => {
      try {
        const { error: updateError } = await supabase
          .from('activity_logs')
          .update({ statusreal: true, date_settled: new Date() })
          .eq('id', id);

        if (updateError) {
          console.error('Error marking as settled:', updateError);
          alert('Failed to mark as settled.');
        } else {
          const index = notifications.value.findIndex((n) => n.id === id);
          if (index !== -1) {
            notifications.value[index].statusreal = true;
            notifications.value[index].date_settled = new Date();
            notifications.value[index].is_read = true;
            notifications.value[index].type = 'settled';
          }
        }
      } catch (err) {
        console.error('Unexpected error marking as settled:', err);
        alert('An unexpected error occurred while marking as settled.');
      }
    };

    const markAsUnread = async (id) => {
      try {
        const { error: updateError } = await supabase
          .from('activity_logs')
          .update({ statusreal: false, date_settled: null })
          .eq('id', id);

        if (updateError) {
          console.error('Error marking as unsettled:', updateError);
          alert('Failed to mark as unsettled.');
        } else {
          const index = notifications.value.findIndex((n) => n.id === id);
          if (index !== -1) {
            notifications.value[index].statusreal = false;
            notifications.value[index].date_settled = null;
            notifications.value[index].is_read = false;
            notifications.value[index].type = 'violation';
          }
        }
      } catch (err) {
        console.error('Unexpected error marking as unsettled:', err);
        alert('An unexpected error occurred while marking as unsettled.');
      }
    };

    const applyBulkAction = async () => {
      if (bulkAction.value === 'read') {
        const unreadNotifications = notifications.value.filter(n => !n.is_read);
        if (unreadNotifications.length > 0) {
          loading.value = true;
          try {
            const idsToUpdate = unreadNotifications.map(n => n.id);
            const { error: bulkUpdateError } = await supabase
              .from('activity_logs')
              .update({ statusreal: true, date_settled: new Date() })
              .in('id', idsToUpdate);

            if (bulkUpdateError) {
              console.error('Error marking all as read:', bulkUpdateError);
              alert('Failed to mark all as read.');
            } else {
              notifications.value = notifications.value.map(n => ({ ...n, is_read: true, statusreal: true, date_settled: n.date_settled || new Date(), type: 'settled' }));
            }
          } catch (err) {
            console.error('Unexpected error marking all as read:', err);
            alert('An unexpected error occurred while marking all as read.');
          } finally {
            loading.value = false;
            bulkAction.value = '';
          }
        } else {
          alert('No unread notifications to mark as read.');
        }
      } else if (bulkAction.value === 'unread') {
        const readNotifications = notifications.value.filter(n => n.is_read);
        if (readNotifications.length > 0) {
          loading.value = true;
          try {
            const idsToUpdate = readNotifications.map(n => n.id);
            const { error: bulkUpdateError } = await supabase
              .from('activity_logs')
              .update({ statusreal: false, date_settled: null })
              .in('id', idsToUpdate);

            if (bulkUpdateError) {
              console.error('Error marking all as unread:', bulkUpdateError);
              alert('Failed to mark all as unread.');
            } else {
              notifications.value = notifications.value.map(n => ({ ...n, is_read: false, statusreal: false, date_settled: null, type: 'violation' }));
            }
          } catch (err) {
            console.error('Unexpected error marking all as unread:', err);
            alert('An unexpected error occurred while marking all as unread.');
          } finally {
            loading.value = false;
            bulkAction.value = '';
          }
        } else {
          alert('No read notifications to mark as unread.');
        }
      }
    };

    onMounted(() => {
      fetchNotifications();
      const subscription = subscribeToActivityLogs();
      setupAutoRefresh();
      
      // Clean up subscription and intervals when component is unmounted
      onUnmounted(() => {
        subscription.unsubscribe();
        if (refreshInterval) clearInterval(refreshInterval);
        if (countdownInterval) clearInterval(countdownInterval);
      });
    });

    return {
      searchQuery,
      sortBy,
      bulkAction,
      notifications,
      filteredNotifications,
      formatDate,
      getNotificationClass,
      loading,
      error,
      markAsRead,
      markAsUnread,
      applyBulkAction,
      subscribeToActivityLogs,
      refreshCountdown,
      manualRefresh
    };
  },
};
</script>

<style scoped>
/* Existing styles */
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
