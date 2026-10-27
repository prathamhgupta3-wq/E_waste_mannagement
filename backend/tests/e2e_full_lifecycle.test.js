const test = require('node:test');
const assert = require('node:assert');
const app = require('../src/app');

let server;
let baseUrl;

test.before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });
});

test.after(async () => {
  await new Promise((resolve) => server.close(resolve));
});

async function request(path, options = {}) {
  const res = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  const data = await res.json();
  return { status: res.status, data };
}

test('E2E: Full Multi-Actor EcoCircuit Workflow', async () => {
  // 1. Frontend is served at root and /code.html
  const rootRes = await fetch(`${baseUrl}/`);
  assert.strictEqual(rootRes.status, 200);
  const rootHtml = await rootRes.text();
  assert.ok(rootHtml.includes('EcoCircuit'));
  assert.ok(rootHtml.includes('id="pickup-modal"'));
  assert.ok(rootHtml.includes('id="dashboard-modal"'));

  // 2. Citizen Self-Registration & Login
  const regCitizen = await request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Aditi Rao',
      email: 'aditi.rao@example.com',
      phone: '9876500001',
      password: 'SecurePassword123!',
      role: 'CITIZEN'
    })
  });
  assert.strictEqual(regCitizen.status, 201);
  const citizenToken = regCitizen.data.data.token;
  const citizenId = regCitizen.data.data.user.id;

  // 3. Citizen Profile Update
  const updateProfile = await request('/api/auth/profile', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${citizenToken}` },
    body: JSON.stringify({
      name: 'Aditi Rao Updated',
      phone: '9876500002'
    })
  });
  assert.strictEqual(updateProfile.status, 200);
  assert.strictEqual(updateProfile.data.data.name, 'Aditi Rao Updated');

  // 4. Citizen creates multi-item pickup request
  const createPickup = await request('/api/pickups', {
    method: 'POST',
    headers: { Authorization: `Bearer ${citizenToken}` },
    body: JSON.stringify({
      pickupAddress: 'Villa 18, Palm Meadows, Airport Rd',
      locality: 'Whitefield',
      pincode: '560066',
      preferredDate: '2026-10-29',
      preferredTimeSlot: 'Morning (08:00 AM - 12:00 PM)',
      items: [
        { wasteCategoryId: 'cat-mobile', quantity: 2, estimatedWeight: 0.5 },
        { wasteCategoryId: 'cat-laptop', quantity: 1, estimatedWeight: 1.8 }
      ]
    })
  });
  assert.strictEqual(createPickup.status, 201);
  const pickupId = createPickup.data.data.id;
  assert.strictEqual(createPickup.data.data.currentStatus, 'PENDING');

  // 5. Citizen views their own pickups & summary statistics
  const myPickups = await request('/api/pickups/my-pickups', {
    headers: { Authorization: `Bearer ${citizenToken}` }
  });
  assert.strictEqual(myPickups.status, 200);
  assert.ok(myPickups.data.data.some(p => p.id === pickupId));
  assert.ok(myPickups.data.summary.totalRequests >= 1);
  assert.ok(myPickups.data.summary.totalKgDiverted >= 2.3);

  // 6. Collector Self-Registration (starts as PENDING verification)
  const regCollector = await request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Rajesh Kumar',
      email: 'rajesh.kumar@ecocollect.in',
      phone: '9876500003',
      password: 'SecurePassword123!',
      role: 'COLLECTOR',
      businessName: 'EcoCollect Logistics Pvt Ltd',
      serviceAreas: ['Whitefield', 'Indiranagar']
    })
  });
  assert.strictEqual(regCollector.status, 201);
  const collectorToken = regCollector.data.data.token;
  const collectorUserId = regCollector.data.data.user.id;

  // 7. Unverified collector CANNOT accept route assignments
  const earlyAccept = await request(`/api/collector/pickups/${pickupId}/accept`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${collectorToken}` }
  });
  assert.strictEqual(earlyAccept.status, 403);
  assert.match(earlyAccept.data.error, /must be verified/i);

  // 8. Admin Logs in
  const adminLogin = await request('/api/auth/demo-login', {
    method: 'POST',
    body: JSON.stringify({ role: 'ADMIN' })
  });
  assert.strictEqual(adminLogin.status, 200);
  const adminToken = adminLogin.data.data.token;

  // 9. Admin lists collectors and verifies Rajesh Kumar
  const collectorsList = await request('/api/admin/collectors', {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert.strictEqual(collectorsList.status, 200);
  assert.ok(collectorsList.data.data.some(c => c.id === collectorUserId && c.verificationStatus === 'PENDING'));

  const verifyCol = await request(`/api/admin/collectors/${collectorUserId}/verify`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ verificationStatus: 'VERIFIED' })
  });
  assert.strictEqual(verifyCol.status, 200);
  assert.strictEqual(verifyCol.data.data.verificationStatus, 'VERIFIED');

  // 10. Admin assigns verified collector to Aditi's pickup
  const assignRes = await request(`/api/admin/pickups/${pickupId}/assign`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ collectorId: collectorUserId })
  });
  assert.strictEqual(assignRes.status, 200);
  assert.strictEqual(assignRes.data.data.currentStatus, 'ASSIGNED');
  assert.strictEqual(assignRes.data.data.collectorId, collectorUserId);

  // 11. Collector views assigned route
  const assignedJobs = await request('/api/collector/assigned', {
    headers: { Authorization: `Bearer ${collectorToken}` }
  });
  assert.strictEqual(assignedJobs.status, 200);
  assert.ok(assignedJobs.data.data.some(j => j.id === pickupId));

  // 12. Verified Collector accepts assigned route
  const acceptRes = await request(`/api/collector/pickups/${pickupId}/accept`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${collectorToken}` }
  });
  assert.strictEqual(acceptRes.status, 200);
  assert.strictEqual(acceptRes.data.data.currentStatus, 'ACCEPTED');

  // 13. Collector arrives at doorstep and verifies citizen OTP
  const collectRes = await request(`/api/collector/pickups/${pickupId}/status`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${collectorToken}` },
    body: JSON.stringify({
      status: 'COLLECTED',
      reason: 'Citizen OTP verified at doorstep. Tamper seal #SEAL-9988 applied.'
    })
  });
  assert.strictEqual(collectRes.status, 200);
  assert.strictEqual(collectRes.data.data.currentStatus, 'COLLECTED');

  // 14. Citizen CANNOT cancel an already COLLECTED pickup
  const invalidCancel = await request(`/api/pickups/${pickupId}/cancel`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${citizenToken}` },
    body: JSON.stringify({ reason: 'Changed mind' })
  });
  assert.strictEqual(invalidCancel.status, 400);

  // 15. Collector delivers to recycler vault and weighs scrap
  const deliverRes = await request(`/api/collector/pickups/${pickupId}/status`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${collectorToken}` },
    body: JSON.stringify({
      status: 'DELIVERED_TO_RECYCLER',
      reason: 'Deposited into Peenya R2v3 Smelter Vault. Confirmed weight 2.3 kg'
    })
  });
  assert.strictEqual(deliverRes.status, 200);
  assert.strictEqual(deliverRes.data.data.currentStatus, 'DELIVERED_TO_RECYCLER');

  // 16. Collector views history summary
  const colHistory = await request('/api/collector/history', {
    headers: { Authorization: `Bearer ${collectorToken}` }
  });
  assert.strictEqual(colHistory.status, 200);
  assert.ok(colHistory.data.summary.totalCompleted >= 1);
  assert.ok(colHistory.data.summary.totalEstimatedWeightKg >= 2.3);

  // 17. Admin Statistics reflect real database queries
  const adminStats = await request('/api/admin/statistics', {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert.strictEqual(adminStats.status, 200);
  assert.ok(adminStats.data.data.platform.totalPickups >= 3);
  assert.ok(adminStats.data.data.platform.totalCollectors >= 2);
  assert.ok(adminStats.data.data.platform.totalCitizens >= 2);
  assert.ok(adminStats.data.data.platform.totalKgDiverted >= 3.0);
});
