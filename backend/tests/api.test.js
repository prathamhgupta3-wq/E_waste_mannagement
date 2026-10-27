const test = require('node:test');
const assert = require('node:assert');
const jwt = require('jsonwebtoken');

const app = require('../src/app');
const config = require('../src/config/env');

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

// Helper for API requests
async function apiRequest(path, options = {}) {
  const url = `${baseUrl}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  const data = await response.json();
  return { status: response.status, data };
}

// -----------------------------------------------------------------------------
// 1. PUBLIC ENDPOINTS
// -----------------------------------------------------------------------------
test('Public: GET /api/health should return 200 and healthy status', async () => {
  const res = await apiRequest('/api/health');
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.data.status, 'HEALTHY');
});

test('Public: GET /api/categories should return all 7 waste categories', async () => {
  const res = await apiRequest('/api/categories');
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.data.success, true);
  assert.ok(res.data.data.length >= 7);
  assert.ok(res.data.data.some(c => c.name === 'Mobile Phones'));
  assert.ok(res.data.data.some(c => c.name === 'Laptops'));
});

test('Public: GET /api/collection-centres should return verified collection centres', async () => {
  const res = await apiRequest('/api/collection-centres');
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.data.success, true);
  assert.ok(res.data.data.length >= 2);
});

// -----------------------------------------------------------------------------
// 2. SUPABASE AUTH: REGISTRATION & SECURITY CONSTRAINTS
// -----------------------------------------------------------------------------
let newCitizenEmail = `citizen.${Date.now()}@example.com`;
let newCollectorEmail = `collector.${Date.now()}@fleet.com`;
let registeredCitizenToken = '';
let registeredCollectorToken = '';
let registeredCollectorId = '';

test('Auth Registration: Citizen successfully registers', async () => {
  const res = await apiRequest('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      name: 'John Citizen',
      email: newCitizenEmail,
      phone: '9876543299',
      password: 'SecurePassword123!',
      role: 'CITIZEN'
    })
  });

  assert.strictEqual(res.status, 201);
  assert.strictEqual(res.data.success, true);
  assert.strictEqual(res.data.data.user.role, 'CITIZEN');
  assert.strictEqual(res.data.data.user.email, newCitizenEmail.toLowerCase());
  assert.ok(res.data.data.token);
  assert.strictEqual(res.data.data.redirectUrl, '/dashboard/citizen');
  registeredCitizenToken = res.data.data.token;
});

test('Auth Registration: Collector registers with initial PENDING verification status', async () => {
  const res = await apiRequest('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      name: 'David Fleet Partner',
      email: newCollectorEmail,
      phone: '9812345678',
      password: 'SecurePassword123!',
      role: 'COLLECTOR',
      businessName: 'GreenTransit Logistics',
      serviceAreas: ['Indiranagar', '560038']
    })
  });

  assert.strictEqual(res.status, 201);
  assert.strictEqual(res.data.success, true);
  assert.strictEqual(res.data.data.user.role, 'COLLECTOR');
  assert.strictEqual(res.data.data.user.collectorProfile.verificationStatus, 'PENDING');
  assert.ok(res.data.data.token);
  assert.strictEqual(res.data.data.redirectUrl, '/dashboard/collector');
  registeredCollectorToken = res.data.data.token;
  registeredCollectorId = res.data.data.user.id;
});

test('Auth Security: Attempt to self-register as ADMIN is strictly rejected with 400/403', async () => {
  const res = await apiRequest('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Malicious Attacker',
      email: 'hacker@exploit.org',
      phone: '9999999999',
      password: 'Password123!',
      role: 'ADMIN' // Trying to self-register as Admin!
    })
  });

  // Must reject and never create an admin account publicly!
  assert.ok(res.status === 400 || res.status === 403);
  assert.strictEqual(res.data.success, false);
});

test('Auth Registration: Duplicate email registration is rejected with 409 Conflict', async () => {
  const res = await apiRequest('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Duplicate John',
      email: newCitizenEmail,
      phone: '9876543299',
      password: 'SecurePassword123!',
      role: 'CITIZEN'
    })
  });

  assert.strictEqual(res.status, 409);
  assert.strictEqual(res.data.success, false);
});

// -----------------------------------------------------------------------------
// 3. LOGIN & SESSION CREATION
// -----------------------------------------------------------------------------
test('Auth Login: Valid credentials return token and role-based redirect URL', async () => {
  const res = await apiRequest('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: newCitizenEmail,
      password: 'SecurePassword123!'
    })
  });

  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.data.success, true);
  assert.ok(res.data.data.token);
  assert.strictEqual(res.data.data.user.role, 'CITIZEN');
  assert.strictEqual(res.data.data.redirectUrl, '/dashboard/citizen');
});

test('Auth Login: Rejects invalid password with 401 Unauthorized', async () => {
  const res = await apiRequest('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: newCitizenEmail,
      password: 'WrongPassword456!'
    })
  });

  assert.strictEqual(res.status, 401);
  assert.strictEqual(res.data.success, false);
});

test('Auth Login: Rejects non-existent email with 401 Unauthorized', async () => {
  const res = await apiRequest('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: 'nonexistent.user@random.com',
      password: 'Password123!'
    })
  });

  assert.strictEqual(res.status, 401);
  assert.strictEqual(res.data.success, false);
});

// -----------------------------------------------------------------------------
// 4. PERSISTENT SESSIONS & PROFILE MANAGEMENT
// -----------------------------------------------------------------------------
test('Auth Profile: GET /api/auth/profile validates persistent session and returns profile', async () => {
  const res = await apiRequest('/api/auth/profile', {
    headers: { Authorization: `Bearer ${registeredCitizenToken}` }
  });

  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.data.success, true);
  assert.strictEqual(res.data.data.name, 'John Citizen');
  assert.strictEqual(res.data.data.role, 'CITIZEN');
});

test('Auth Profile: GET /api/auth/me returns identical verified profile', async () => {
  const res = await apiRequest('/api/auth/me', {
    headers: { Authorization: `Bearer ${registeredCitizenToken}` }
  });

  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.data.data.email, newCitizenEmail.toLowerCase());
});

test('Auth Profile: PUT /api/auth/profile updates user profile', async () => {
  const res = await apiRequest('/api/auth/profile', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${registeredCitizenToken}` },
    body: JSON.stringify({
      name: 'John Citizen Updated',
      phone: '9988776655'
    })
  });

  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.data.success, true);
  assert.strictEqual(res.data.data.name, 'John Citizen Updated');
  assert.strictEqual(res.data.data.phone, '9988776655');
});

// -----------------------------------------------------------------------------
// 5. EXPIRED SESSIONS & UNAUTHORISED ACCESS
// -----------------------------------------------------------------------------
test('Auth Token: Rejects malformed token with 401 Unauthorized', async () => {
  const res = await apiRequest('/api/auth/profile', {
    headers: { Authorization: 'Bearer this-is-not-a-valid-token' }
  });

  assert.strictEqual(res.status, 401);
  assert.strictEqual(res.data.success, false);
});

test('Auth Token: Rejects expired session token with 401 Unauthorized', async () => {
  // Create an artificially expired token (-10 seconds)
  const expiredToken = jwt.sign(
    { sub: 'user-citizen-01', email: 'sarah.chen@example.com', role: 'CITIZEN' },
    config.jwt.secret,
    { expiresIn: '-10s' }
  );

  const res = await apiRequest('/api/auth/profile', {
    headers: { Authorization: `Bearer ${expiredToken}` }
  });

  assert.strictEqual(res.status, 401);
  assert.strictEqual(res.data.success, false);
  assert.ok(res.data.error.includes('expired') || res.data.error.includes('Unauthorized'));
});

// -----------------------------------------------------------------------------
// 6. ROLE-BASED ACCESS CONTROL (RBAC)
// -----------------------------------------------------------------------------
let demoAdminToken = '';
let demoCollectorToken = '';

test('Auth: Obtain Demo Admin and Collector tokens for RBAC tests', async () => {
  const adminRes = await apiRequest('/api/auth/demo-login', {
    method: 'POST',
    body: JSON.stringify({ role: 'ADMIN' })
  });
  assert.strictEqual(adminRes.status, 200);
  demoAdminToken = adminRes.data.data.token;

  const collectorRes = await apiRequest('/api/auth/demo-login', {
    method: 'POST',
    body: JSON.stringify({ role: 'COLLECTOR' })
  });
  assert.strictEqual(collectorRes.status, 200);
  demoCollectorToken = collectorRes.data.data.token;
});

test('RBAC: Citizen is rejected from collector routes with 403 Forbidden', async () => {
  const res = await apiRequest('/api/collector/assigned', {
    headers: { Authorization: `Bearer ${registeredCitizenToken}` }
  });
  assert.strictEqual(res.status, 403);
  assert.strictEqual(res.data.success, false);
});

test('RBAC: Citizen is rejected from admin routes with 403 Forbidden', async () => {
  const res = await apiRequest('/api/admin/statistics', {
    headers: { Authorization: `Bearer ${registeredCitizenToken}` }
  });
  assert.strictEqual(res.status, 403);
  assert.strictEqual(res.data.success, false);
});

test('RBAC: Collector is rejected from admin routes with 403 Forbidden', async () => {
  const res = await apiRequest('/api/admin/statistics', {
    headers: { Authorization: `Bearer ${registeredCollectorToken}` }
  });
  assert.strictEqual(res.status, 403);
  assert.strictEqual(res.data.success, false);
});

test('RBAC: Admin has authorized access to admin statistics', async () => {
  const res = await apiRequest('/api/admin/statistics', {
    headers: { Authorization: `Bearer ${demoAdminToken}` }
  });
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.data.success, true);
});

// -----------------------------------------------------------------------------
// 7. COLLECTOR VERIFICATION WORKFLOW
// -----------------------------------------------------------------------------
test('Collector: Newly registered collector has PENDING verification status', async () => {
  const res = await apiRequest('/api/collector/verification-status', {
    headers: { Authorization: `Bearer ${registeredCollectorToken}` }
  });

  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.data.data.verificationStatus, 'PENDING');
});

test('Admin: Admin verifies collector account (PENDING -> VERIFIED)', async () => {
  const res = await apiRequest(`/api/admin/collectors/${registeredCollectorId}/verify`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${demoAdminToken}` },
    body: JSON.stringify({ verificationStatus: 'VERIFIED' })
  });

  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.data.success, true);
  assert.strictEqual(res.data.data.verificationStatus, 'VERIFIED');
});

test('Collector: Verification status now reflects VERIFIED', async () => {
  const res = await apiRequest('/api/collector/verification-status', {
    headers: { Authorization: `Bearer ${registeredCollectorToken}` }
  });

  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.data.data.verificationStatus, 'VERIFIED');
});

// -----------------------------------------------------------------------------
// 8. SECURE ADMIN PROVISIONING
// -----------------------------------------------------------------------------
test('Admin Provisioning: Public or Citizen cannot provision an admin account (401/403)', async () => {
  const res = await apiRequest('/api/admin/provision-admin', {
    method: 'POST',
    headers: { Authorization: `Bearer ${registeredCitizenToken}` },
    body: JSON.stringify({
      name: 'Rogue Admin',
      email: 'rogue@admin.com',
      phone: '9900112233',
      password: 'AdminPassword123!'
    })
  });

  assert.strictEqual(res.status, 403);
});

test('Admin Provisioning: Existing Administrator securely provisions a new Administrator', async () => {
  const newAdminEmail = `admin.${Date.now()}@ecocircuit.org`;
  const res = await apiRequest('/api/admin/provision-admin', {
    method: 'POST',
    headers: { Authorization: `Bearer ${demoAdminToken}` },
    body: JSON.stringify({
      name: 'Security Ops Lead',
      email: newAdminEmail,
      phone: '9900112233',
      password: 'AdminPassword123!'
    })
  });

  assert.strictEqual(res.status, 201);
  assert.strictEqual(res.data.success, true);
  assert.strictEqual(res.data.data.role, 'ADMIN');

  // Verify newly provisioned admin can log in
  const loginRes = await apiRequest('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: newAdminEmail,
      password: 'AdminPassword123!'
    })
  });

  assert.strictEqual(loginRes.status, 200);
  assert.strictEqual(loginRes.data.data.user.role, 'ADMIN');
  assert.strictEqual(loginRes.data.data.redirectUrl, '/dashboard/admin');
});

// -----------------------------------------------------------------------------
// 9. LOGOUT
// -----------------------------------------------------------------------------
test('Auth Logout: POST /api/auth/logout responds with success', async () => {
  const res = await apiRequest('/api/auth/logout', {
    method: 'POST',
    headers: { Authorization: `Bearer ${registeredCitizenToken}` }
  });

  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.data.success, true);
});

// -----------------------------------------------------------------------------
// 10. PICKUP LIFECYCLE (END-TO-END)
// -----------------------------------------------------------------------------
let lifecyclePickupId = '';

test('Pickups: Citizen creates pickup request (Status: PENDING)', async () => {
  const res = await apiRequest('/api/pickups', {
    method: 'POST',
    headers: { Authorization: `Bearer ${registeredCitizenToken}` },
    body: JSON.stringify({
      pickupAddress: 'Block C, Tech Park View, Whitefield',
      locality: 'Whitefield',
      pincode: '560066',
      preferredDate: '2026-10-30',
      preferredTimeSlot: 'Morning (08:00 AM - 12:00 PM)',
      items: [
        {
          wasteCategoryId: 'cat-laptop',
          quantity: 1,
          estimatedWeight: 1.8,
          description: 'MacBook Air M1'
        }
      ]
    })
  });

  assert.strictEqual(res.status, 201);
  assert.strictEqual(res.data.data.currentStatus, 'PENDING');
  lifecyclePickupId = res.data.data.id;
});

test('Pickups: Admin assigns collector (PENDING -> ASSIGNED)', async () => {
  const res = await apiRequest(`/api/admin/pickups/${lifecyclePickupId}/assign`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${demoAdminToken}` },
    body: JSON.stringify({ collectorId: registeredCollectorId })
  });

  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.data.data.currentStatus, 'ASSIGNED');
});

test('Pickups: Collector accepts pickup (ASSIGNED -> ACCEPTED)', async () => {
  const res = await apiRequest(`/api/collector/pickups/${lifecyclePickupId}/accept`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${registeredCollectorToken}` }
  });

  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.data.data.currentStatus, 'ACCEPTED');
});

test('Collector Details: Collector reviews collection details for assigned pickup', async () => {
  const res = await apiRequest(`/api/collector/pickups/${lifecyclePickupId}`, {
    headers: { Authorization: `Bearer ${registeredCollectorToken}` }
  });

  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.data.success, true);
  assert.strictEqual(res.data.data.id, lifecyclePickupId);
  assert.ok(res.data.data.citizenName);
  assert.ok(res.data.data.statusHistory.length >= 3);
});

test('Collector Validation: Rejects invalid status transition jump (400 Bad Request)', async () => {
  // Attempt invalid transition directly from ACCEPTED to COMPLETED (skipping COLLECTED)
  const res = await apiRequest(`/api/collector/pickups/${lifecyclePickupId}/status`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${registeredCollectorToken}` },
    body: JSON.stringify({ status: 'COMPLETED' })
  });

  assert.strictEqual(res.status, 400);
  assert.match(res.data.error, /invalid status transition/i);
});

test('Pickups: Collector marks collected (ACCEPTED -> COLLECTED)', async () => {
  const res = await apiRequest(`/api/collector/pickups/${lifecyclePickupId}/status`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${registeredCollectorToken}` },
    body: JSON.stringify({
      status: 'COLLECTED',
      reason: 'Doorstep handoff verified via OTP'
    })
  });

  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.data.data.currentStatus, 'COLLECTED');
});

test('Collector Lifecycle: Collector marks delivered to recycler and reviews collection history', async () => {
  const res = await apiRequest(`/api/collector/pickups/${lifecyclePickupId}/status`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${registeredCollectorToken}` },
    body: JSON.stringify({
      status: 'DELIVERED_TO_RECYCLER',
      reason: 'Delivered to certified R2v3 Smelter Vault'
    })
  });

  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.data.data.currentStatus, 'DELIVERED_TO_RECYCLER');

  // Review history
  const historyRes = await apiRequest('/api/collector/history', {
    headers: { Authorization: `Bearer ${registeredCollectorToken}` }
  });
  assert.strictEqual(historyRes.status, 200);
  assert.ok(historyRes.data.data.some(p => p.id === lifecyclePickupId));
  assert.ok(historyRes.data.summary.totalCompleted >= 1);
});

test('Pickups: Full lifecycle status history audit trail is immutable', async () => {
  const res = await apiRequest(`/api/pickups/${lifecyclePickupId}/history`, {
    headers: { Authorization: `Bearer ${registeredCitizenToken}` }
  });

  assert.strictEqual(res.status, 200);
  assert.ok(res.data.data.length >= 4);
  assert.strictEqual(res.data.data[0].newStatus, 'PENDING');
  assert.strictEqual(res.data.data[1].newStatus, 'ASSIGNED');
  assert.strictEqual(res.data.data[2].newStatus, 'ACCEPTED');
  assert.strictEqual(res.data.data[3].newStatus, 'COLLECTED');
});

// -----------------------------------------------------------------------------
// 7. CITIZEN ISOLATION & CANCELLATION TESTS
// -----------------------------------------------------------------------------
test('Citizen Isolation: Second citizen cannot access first citizen pickup details (403 Forbidden)', async () => {
  // Register Citizen B
  const regB = await apiRequest('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Bob Miller',
      email: 'bob.miller@example.com',
      phone: '9888877777',
      password: 'Password123!',
      role: 'CITIZEN'
    })
  });
  assert.strictEqual(regB.status, 201);
  const citizenBToken = regB.data.data.token;

  // Citizen B attempts to access Citizen A's pickup
  const res = await apiRequest(`/api/pickups/${lifecyclePickupId}`, {
    headers: { Authorization: `Bearer ${citizenBToken}` }
  });
  assert.strictEqual(res.status, 403);
  assert.strictEqual(res.data.success, false);

  // Citizen B attempts to cancel Citizen A's pickup
  const cancelRes = await apiRequest(`/api/pickups/${lifecyclePickupId}/cancel`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${citizenBToken}` }
  });
  assert.strictEqual(cancelRes.status, 403);
});

test('Citizen Pickup Cancellation: Citizen can cancel their own PENDING pickup', async () => {
  // Create a new PENDING pickup for Citizen B
  const loginB = await apiRequest('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: 'bob.miller@example.com',
      password: 'Password123!'
    })
  });
  const tokenB = loginB.data.data.token;

  const createRes = await apiRequest('/api/pickups', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenB}` },
    body: JSON.stringify({
      pickupAddress: 'Sector 5, HSR Layout, 5th Main',
      locality: 'HSR Layout',
      pincode: '560102',
      preferredDate: '2026-10-28',
      preferredTimeSlot: 'Afternoon (12:00 PM - 04:00 PM)',
      items: [{ wasteCategoryId: 'cat-batteries', quantity: 3, estimatedWeight: 1.2 }]
    })
  });
  assert.strictEqual(createRes.status, 201);
  const bobPickupId = createRes.data.data.id;

  // Bob cancels his own pending pickup
  const cancelRes = await apiRequest(`/api/pickups/${bobPickupId}/cancel`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenB}` },
    body: JSON.stringify({ reason: 'Plans changed' })
  });
  assert.strictEqual(cancelRes.status, 200);
  assert.strictEqual(cancelRes.data.data.currentStatus, 'CANCELLED');

  // Attempting to cancel again is rejected (invalid transition from CANCELLED)
  const doubleCancelRes = await apiRequest(`/api/pickups/${bobPickupId}/cancel`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenB}` }
  });
  assert.strictEqual(doubleCancelRes.status, 400);
});

// -----------------------------------------------------------------------------
// 8. COLLECTOR ISOLATION & VERIFICATION ENFORCEMENT
// -----------------------------------------------------------------------------
test('Collector Enforcement: Unverified collector cannot accept pickups (403 Forbidden)', async () => {
  // Register Unverified Collector
  const regCol = await apiRequest('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Unverified Hauler',
      email: 'unverified.hauler@example.com',
      phone: '9777766666',
      password: 'Password123!',
      role: 'COLLECTOR',
      businessName: 'Unverified E-Waste Hub',
      serviceAreas: ['Whitefield']
    })
  });
  assert.strictEqual(regCol.status, 201);
  const unverifiedToken = regCol.data.data.token;

  // Attempt to accept pickup
  const res = await apiRequest(`/api/collector/pickups/${lifecyclePickupId}/accept`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${unverifiedToken}` }
  });
  assert.strictEqual(res.status, 403);
  assert.match(res.data.error, /must be verified/i);
});

test('Collector Isolation: Collector cannot accept or update unassigned pickup (403 Forbidden)', async () => {
  // Register Second Verified Collector
  const regCol2 = await apiRequest('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Second Collector',
      email: 'collector2@example.com',
      phone: '9555544444',
      password: 'Password123!',
      role: 'COLLECTOR'
    })
  });
  const col2UserId = regCol2.data.data.user.id;
  const col2Token = regCol2.data.data.token;

  // Verify Col2 via Admin
  await apiRequest(`/api/admin/collectors/${col2UserId}/verify`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${demoAdminToken}` },
    body: JSON.stringify({ verificationStatus: 'VERIFIED' })
  });

  // Col2 attempts to update status on pickup assigned to Col1
  const res = await apiRequest(`/api/collector/pickups/${lifecyclePickupId}/status`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${col2Token}` },
    body: JSON.stringify({ status: 'DELIVERED_TO_RECYCLER' })
  });
  assert.strictEqual(res.status, 403);
  assert.match(res.data.error, /not authorized/i);

  // Col2 attempts to view details of pickup assigned to Col1
  const detailsRes = await apiRequest(`/api/collector/pickups/${lifecyclePickupId}`, {
    headers: { Authorization: `Bearer ${col2Token}` }
  });
  assert.strictEqual(detailsRes.status, 403);
  assert.match(detailsRes.data.error, /forbidden|access/i);
});

// -----------------------------------------------------------------------------
// 9. ADMIN COLLECTORS LIST & REAL STATISTICS QUERIES
// -----------------------------------------------------------------------------
test('Admin: GET /api/admin/collectors lists all collectors with statuses', async () => {
  const res = await apiRequest('/api/admin/collectors', {
    headers: { Authorization: `Bearer ${demoAdminToken}` }
  });
  assert.strictEqual(res.status, 200);
  assert.ok(Array.isArray(res.data.data));
  assert.ok(res.data.data.length >= 2);
  assert.ok(res.data.data.some(c => c.email === 'collector2@example.com'));
});

test('Admin: GET /api/admin/statistics aggregates database-derived numbers', async () => {
  const res = await apiRequest('/api/admin/statistics', {
    headers: { Authorization: `Bearer ${demoAdminToken}` }
  });
  assert.strictEqual(res.status, 200);
  assert.ok(res.data.data.platform.totalPickups >= 2);
  assert.ok(res.data.data.platform.totalKgDiverted > 0);
  assert.ok(res.data.data.platform.totalCitizens >= 2);
  assert.ok(res.data.data.platform.totalCollectors >= 2);
});

test('Admin: GET /api/admin/users lists users with role filter and search', async () => {
  const res = await apiRequest('/api/admin/users?role=CITIZEN', {
    headers: { Authorization: `Bearer ${demoAdminToken}` }
  });
  assert.strictEqual(res.status, 200);
  assert.ok(res.data.data.length >= 1);
  assert.ok(res.data.data.every(u => u.role === 'CITIZEN'));
  // Ensure passwords are never leaked
  assert.strictEqual(res.data.data[0].passwordHash, undefined);

  // Search by name
  const searchRes = await apiRequest('/api/admin/users?search=Sarah', {
    headers: { Authorization: `Bearer ${demoAdminToken}` }
  });
  assert.strictEqual(searchRes.status, 200);
  assert.ok(searchRes.data.data.some(u => u.name.includes('Sarah')));
});

test('Admin: Statutory records preservation rejects DELETE /api/admin/pickups/:id (400 Bad Request)', async () => {
  const res = await apiRequest(`/api/admin/pickups/${lifecyclePickupId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${demoAdminToken}` }
  });
  assert.strictEqual(res.status, 400);
  assert.match(res.data.error, /cannot be deleted|chain-of-custody/i);
});

test('Admin: GET /api/admin/audit-trail returns platform status transitions', async () => {
  const res = await apiRequest('/api/admin/audit-trail', {
    headers: { Authorization: `Bearer ${demoAdminToken}` }
  });
  assert.strictEqual(res.status, 200);
  assert.ok(Array.isArray(res.data.data));
  assert.ok(res.data.data.length >= 4);
});

test('Admin: PATCH /api/admin/collection-centres/:id updates centre details', async () => {
  const res = await apiRequest('/api/admin/collection-centres/centre-01', {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${demoAdminToken}` },
    body: JSON.stringify({ contactDetails: '+91 80 4455 6677' })
  });
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.data.data.contactDetails, '+91 80 4455 6677');
});
