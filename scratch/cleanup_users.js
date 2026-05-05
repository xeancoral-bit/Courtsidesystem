
import { createClient } from '@supabase/supabase-js';

// No need for dotenv if running with: node --env-file=.env scratch/cleanup_users.js
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase env vars (VITE_SUPABASE_URL, VITE_SUPABASE_SERVICE_ROLE_KEY)');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function cleanup() {
  console.log('Fetching users...');
  
  // 1. Get all auth users
  const { data: { users }, error: uErr } = await supabase.auth.admin.listUsers();
  if (uErr) throw uErr;
  
  const authIds = new Set(users.map(u => u.id));
  const unconfirmedIds = users.filter(u => !u.confirmed_at).map(u => u.id);
  
  console.log(`Found ${users.length} auth users. ${unconfirmedIds.length} unconfirmed.`);

  // 2. Get all profiles
  const { data: profiles, error: pErr } = await supabase.from('profiles').select('id, display_name');
  if (pErr) throw pErr;
  
  const orphanedProfiles = profiles.filter(p => !authIds.has(p.id));
  console.log(`Found ${orphanedProfiles.length} orphaned profiles.`);
  
  // 3. Delete orphaned profiles
  for (const p of orphanedProfiles) {
    console.log(`Deleting orphaned profile: ${p.display_name} (${p.id})`);
    await supabase.from('profiles').delete().eq('id', p.id);
    await supabase.from('user_roles').delete().eq('user_id', p.id);
  }
  
  // 4. Delete unconfirmed auth users (as requested)
  for (const id of unconfirmedIds) {
    console.log(`Deleting unconfirmed user: ${id}`);
    await supabase.auth.admin.deleteUser(id);
    // Triggers will likely clean up profiles/roles, but we ensure it
    await supabase.from('profiles').delete().eq('id', id);
    await supabase.from('user_roles').delete().eq('user_id', id);
  }
  
  console.log('Cleanup complete.');
}

cleanup().catch(console.error);
