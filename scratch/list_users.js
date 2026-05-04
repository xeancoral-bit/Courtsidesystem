
import { createClient } from '@supabase/supabase-js';

const url = "https://drompkfqvmdwqqcsftlv.supabase.co";
const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb21wa2Zxdm1kd3FxY3NmdGx2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0NDU4NzgsImV4cCI6MjA5MzAyMTg3OH0.lpF4Wuh_Q3zEr0J8bxlGCmRDXRIyYbA3aGOVo8-PHyE";

const supabase = createClient(url, key);

async function listUsers() {
  console.log('Fetching profiles...');
  const { data, error } = await supabase.from('profiles').select('*');
  if (error) {
    console.error('Error fetching profiles:', error.message);
  } else {
    console.log('Profiles found:', data.length);
    console.log(JSON.stringify(data, null, 2));
  }

  console.log('Fetching roles...');
  const { data: roles, error: rolesError } = await supabase.from('user_roles').select('*');
  if (rolesError) {
    console.error('Error fetching roles:', rolesError.message);
  } else {
    console.log('Roles found:', roles.length);
    console.log(JSON.stringify(roles, null, 2));
  }
}

listUsers();
