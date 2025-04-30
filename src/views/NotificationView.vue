<template>
  <div class="notifications-container">
    <div class="notifications-header">
      <h1>Student Violations</h1>
      <div class="actions">
        <div class="search-bar">
          <input type="text" placeholder="Search" v-model="searchQuery">
        </div>
        <div class="sort-by">
          <span>Sort by:</span>
          <select v-model="sortBy">
            <option value="created_at_desc">Newest</option>
            <option value="created_at_asc">Oldest</option>
          </select>
        </div>
      </div>
    </div>
    <ul class="notifications-list">
      <li v-for="notification in filteredNotifications" :key="notification.id" class="notification-item" :class="getNotificationClass(notification)">
        <template v-if="notification.type === 'violation'">
          <p>
            <span class="user-name">{{ notification.students?.student_name }}</span> has violated
            <span class="violation">{{ notification.violation_categories?.name }}</span> on
            <span class="date">{{ formatDate(notification.created_at) }}</span>; please review and take appropriate action.
          </p>
        </template>
        <template v-else-if="notification.type === 'settled'">
          <p>
            <span class="user-name">{{ notification.students?.student_name }}</span> has settled their violation regarding
            <span class="violation">{{ notification.violation_categories?.name }}</span> on
            <span class="date">{{ formatDate(notification.date_settled) }}.</span>
          </p>
        </template>
        <template v-else-if="notification.type === 'overdue'">
          <p class="overdue">
            <span class="user-name">{{ notification.students?.student_name }}</span> has an overdue violation from
            <span class="date">{{ formatDate(notification.date_recorded) }}</span> that remains unsettled;
            <button class="action-button">click to view the violation and notify the student.</button>
          </p>
        </template>
        <template v-else>
          <p>Unknown notification type.</p>
        </template>
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
import { ref, computed, onMounted } from 'vue';
import moment from 'moment';
import supabase from '@/components/Supabase'; // Adjust the import path if needed

export default {
  setup() {
    const searchQuery = ref('');
    const sortBy = ref('created_at_desc');
    const notifications = ref([]);
    const loading = ref(false);
    const error = ref(null);

    const filteredNotifications = computed(() => {
      return notifications.value
        .filter(notification => {
          const searchTerm = searchQuery.value.toLowerCase();
          const studentName = notification.students?.student_name?.toLowerCase() || '';
          const violationName = notification.violation_categories?.name?.toLowerCase() || '';
          return (
            studentName.includes(searchTerm) ||
            violationName.includes(searchTerm)
          );
        })
        .sort((a, b) => {
          const dateA = new Date(a.created_at);
          const dateB = new Date(b.created_at);
          return sortBy.value === 'created_at_desc' ? dateB - dateA : dateA - dateB;
        });
    });

    const formatDate = (date) => {
      return moment(date).format('YYYY-MM-DD HH:mm:ss');
    };

    const getNotificationClass = (notification) => {
      if (notification.type === 'violation') {
        return 'new'; // You might want to base this on a 'is_read' status or similar
      } else if (notification.type === 'settled') {
        return 'settled';
      } else if (notification.type === 'overdue') {
        return 'overdue';
      }
      return '';
    };

    const fetchNotifications = async () => {
      loading.value = true;
      error.value = null;
      try {
        const { data, error: fetchError } = await supabase
          .from('notifications')
          .select(`
            id,
            title,
            message,
            type,
            is_read,
            created_at,
            date_settled,
            date_recorded,
            students (
              student_name
            ),
            violation_categories (
              name
            )
          `)
          .order('created_at', { ascending: false });

        if (fetchError) {
          console.error('Error fetching notifications:', fetchError);
          error.value = fetchError.message;
        } else {
          notifications.value = data;
        }
      } catch (err) {
        console.error('Unexpected error fetching notifications:', err);
        error.value = err.message;
      } finally {
        loading.value = false;
      }
    };

    onMounted(fetchNotifications);

    return {
      searchQuery,
      sortBy,
      notifications,
      filteredNotifications,
      formatDate,
      getNotificationClass,
      loading,
      error,
    };
  },
};
</script>

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
</style>