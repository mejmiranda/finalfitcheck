<template>
  <div class="profile-container">
    <div class="profile-header">
      <img src="@/assets/profilepic.jpg" alt="Profile Picture" class="profile-picture">
      <div class="profile-info">
        <h1>{{ studentProfile.student_name }}</h1>
        <p class="position">Student</p>
        <p><strong>Email:</strong> {{ studentProfile.email }}</p>
        <p><strong>Student ID:</strong> {{ studentProfile.student_number }}</p>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue';
import supabase from '@/components/Supabase'; 

export default {
  setup() {
    const studentProfile = ref({
      student_name: '',
      student_number: '',
      email: '',
    });

    const fetchStudentProfile = async () => {
      const studentID = localStorage.getItem('authToken');
      const { data, error } = await supabase
        .from('students')
        .select('student_name, student_number, email')
        .eq('id', studentID) // Assuming 'id' is the primary key
        .single();

      if (error) {
        console.error('Error fetching student profile:', error);
      } else {
        studentProfile.value = data;
      }
    };

    onMounted(() => {
      fetchStudentProfile();
    });

    return {
      studentProfile,
    };
  },
};
</script>

<style scoped>
/* Your existing styles for profile-container, profile-header, profile-picture, profile-info, h1, .position, p */
.profile-container {
  font-family: sans-serif;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 0 0 rgba(0, 0, 0, 0.1);
  max-width: 800px;
}

.profile-header {
  display: flex;
  align-items: center;
  gap: 30px;
  margin-bottom: 30px;
  padding: 30px;
  border-radius: 4px;
}

.profile-picture {
  width: 150px;
  height: 150px;
  border-radius: 50%;
  object-fit: cover;
  border: 3px solid #ddd;
  flex-shrink: 0;
}

.profile-info {
  flex-grow: 1;
}

.profile-info h1 {
  margin-top: 0;
  color: #333;
  margin-bottom: 10px;
  font-size: 2em;
}

.profile-info .position {
  color: #777;
  font-size: 1.1em;
  margin-bottom: 15px;
}

.profile-info p {
  margin: 8px 0;
  color: #555;
  font-size: 1em;
}
</style>