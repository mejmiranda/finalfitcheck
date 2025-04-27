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
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
          </select>
        </div>
      </div>
    </div>
    <ul class="notifications-list">
      <li v-for="(notification, index) in filteredNotifications" :key="index" class="notification-item" :class="notification.status">
        <template v-if="notification.type === 'violation'">
          <p>
            <span class="user-name">{{ notification.userName }}</span> has violated
            <span class="violation">{{ notification.specificRule }}</span> on
            <span class="date">{{ formatDate(notification.date) }}</span>; please review and take appropriate action.
          </p>
        </template>
        <template v-else-if="notification.type === 'settled'">
          <p>
            <span class="user-name">{{ notification.userName }}</span> has settled their violation regarding
            <span class="violation">{{ notification.specificRule }}</span> on
            <span class="date">{{ formatDate(notification.date) }}.</span>
          </p>
        </template>
        <template v-else-if="notification.type === 'overdue'">
          <p class="overdue">
            <span class="user-name">{{ notification.userName }}</span> has an overdue violation from
            <span class="date">{{ formatDate(notification.date) }}</span> that remains unsettled;
            <button class="action-button">click to view the violation and notify the student.</button>
          </p>
        </template>
        <template v-else>
          <p>Unknown notification type.</p>
        </template>
      </li>
      <li v-if="filteredNotifications.length === 0">
        <p class="empty-message">No notifications found.</p>
      </li>
    </ul>
  </div>
</template>

<script>
import { ref, computed } from 'vue';
import moment from 'moment'; // You might need to install this: npm install moment

export default {
  setup() {
    const searchQuery = ref('');
    const sortBy = ref('newest');
    const notifications = ref([
      { type: 'violation', userName: '[User Name]', specificRule: '[specific rule]', date: '2025-04-05T08:00:00Z', status: 'new' },
      { type: 'settled', userName: '[User Name]', specificRule: '[specific rule]', date: '2025-04-04T15:30:00Z', status: 'settled' },
      { type: 'overdue', userName: '[User Name]', specificRule: '[specific rule]', date: '2025-04-01T10:45:00Z', status: 'overdue' },
      { type: 'violation', userName: '[User Name]', specificRule: '[specific rule]', date: '2025-04-03T19:15:00Z', status: 'new' },
      { type: 'settled', userName: '[User Name]', specificRule: '[specific rule]', date: '2025-04-02T11:00:00Z', status: 'settled' },
      { type: 'overdue', userName: '[User Name]', specificRule: '[specific rule]', date: '2025-03-30T14:20:00Z', status: 'overdue' },
      { type: 'violation', userName: '[User Name]', specificRule: '[specific rule]', date: '2025-04-05T09:30:00Z', status: 'new' },
      { type: 'settled', userName: '[User Name]', specificRule: '[specific rule]', date: '2025-04-03T08:45:00Z', status: 'settled' },
      { type: 'overdue', userName: '[User Name]', specificRule: '[specific rule]', date: '2025-03-28T16:00:00Z', status: 'overdue' },
      { type: 'violation', userName: '[User Name]', specificRule: '[specific rule]', date: '2025-04-04T12:00:00Z', status: 'new' },
      { type: 'settled', userName: '[User Name]', specificRule: '[specific rule]', date: '2025-04-02T17:15:00Z', status: 'settled' },
      { type: 'overdue', userName: '[User Name]', specificRule: '[specific rule]', date: '2025-03-26T09:50:00Z', status: 'overdue' },
      { type: 'violation', userName: '[User Name]', specificRule: '[specific rule]', date: '2025-04-03T21:45:00Z', status: 'new' },
      { type: 'settled', userName: '[User Name]', specificRule: '[specific rule]', date: '2025-04-01T13:00:00Z', status: 'settled' },
      { type: 'overdue', userName: '[User Name]', specificRule: '[specific rule]', date: '2025-03-24T18:30:00Z', status: 'overdue' },
      { type: 'violation', userName: '[User Name]', specificRule: '[specific rule]', date: '2025-04-05T07:15:00Z', status: 'new' },
    ]);

    const filteredNotifications = computed(() => {
      return notifications.value
        .filter(notification => {
          const searchTerm = searchQuery.value.toLowerCase();
          return (
            notification.userName.toLowerCase().includes(searchTerm) ||
            notification.specificRule.toLowerCase().includes(searchTerm)
          );
        })
        .sort((a, b) => {
          if (sortBy.value === 'newest') {
            return new Date(b.date) - new Date(a.date);
          } else if (sortBy.value === 'oldest') {
            return new Date(a.date) - new Date(b.date);
          }
          return 0;
        });
    });

    const formatDate = (date) => {
      return moment(date).format('YYYY-MM-DD HH:mm:ss');
    };

    return {
      searchQuery,
      sortBy,
      notifications,
      filteredNotifications,
      formatDate,
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
</style>