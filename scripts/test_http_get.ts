import fetch from 'node-fetch';

async function run() {
  const token = process.env.ADMIN_BEARER_TOKEN || 'your-32-character-admin-token-placeholder';
  const res = await fetch('http://localhost:3000/api/v1/admin/majors?pageSize=5', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  const text = await res.text();
  console.log('HTTP Status:', res.status);
  console.log('HTTP Response Text (first 500 chars):', text.substring(0, 500));
}
run().catch(e => { console.error(e); process.exitCode = 1; });
