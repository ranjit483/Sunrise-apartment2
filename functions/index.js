/**
 * Firebase Cloud Functions - User Profile Management
 * 
 * This file contains Firebase functions to handle user authentication
 * and automatic profile creation in Firestore.
 * 
 * To deploy:
 * 1. Initialize Firebase: firebase init functions
 * 2. Copy this to functions/index.js
 * 3. Deploy: firebase deploy --only functions
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

// ============================================
// AUTH TRIGGER - Create User Profile on Signup
// ============================================
exports.onUserCreate = functions.auth.user().onCreate(async (user) => {
  const { uid, email, displayName, photoURL, phoneNumber } = user;

  console.log(`New user created: ${uid}`);

  // Default role for new users (will be updated after role selection)
  const userData = {
    uid: uid,
    email: email,
    fullName: displayName || '',
    phone: phoneNumber || '',
    role: 'TENANT', // Default - should be updated during onboarding
    status: 'pending_approval',
    unitNumber: null,
    profileImage: photoURL || null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  try {
    await admin.firestore().collection('users').doc(uid).set(userData);
    console.log(`User profile created for: ${uid}`);
    return { success: true };
  } catch (error) {
    console.error('Error creating user profile:', error);
    return { success: false, error: error.message };
  }
});

// ============================================
// AUTH TRIGGER - Handle User Deletion
// ============================================
exports.onUserDelete = functions.auth.user().onDelete(async (user) => {
  const { uid } = user;
  
  try {
    await admin.firestore().collection('users').doc(uid).delete();
    console.log(`User profile deleted for: ${uid}`);
    return { success: true };
  } catch (error) {
    console.error('Error deleting user profile:', error);
    return { success: false, error: error.message };
  }
});

// ============================================
// callable function - Approve User
// ============================================
exports.approveUser = functions.https.onCall(async (data, context) => {
  // Check if caller is Super Admin
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'User must be authenticated'
    );
  }

  const callerUid = context.auth.uid;
  const callerDoc = await admin.firestore().collection('users').doc(callerUid).get();
  const callerData = callerDoc.data();

  if (callerData?.role !== 'SUPER_ADMIN') {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Only Super Admin can approve users'
    );
  }

  const { targetUserUid } = data;

  if (!targetUserUid) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'targetUserUid is required'
    );
  }

  await admin.firestore().collection('users').doc(targetUserUid).update({
    status: 'approved',
    approvedBy: callerUid,
    approvedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  return { success: true, message: 'User approved successfully' };
});

// ============================================
// callable function - Reject User
// ============================================
exports.rejectUser = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const callerUid = context.auth.uid;
  const callerDoc = await admin.firestore().collection('users').doc(callerUid).get();
  
  if (callerDoc.data()?.role !== 'SUPER_ADMIN') {
    throw new functions.https.HttpsError('permission-denied', 'Only Super Admin can reject users');
  }

  const { targetUserUid, reason } = data;

  await admin.firestore().collection('users').doc(targetUserUid).update({
    status: 'rejected',
    rejectedBy: callerUid,
    rejectedAt: new Date().toISOString(),
    rejectionReason: reason || '',
    updatedAt: new Date().toISOString(),
  });

  return { success: true, message: 'User rejected' };
});

// ============================================
// callable function - Update User Role
// ============================================
exports.updateUserRole = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const callerUid = context.auth.uid;
  const callerDoc = await admin.firestore().collection('users').doc(callerUid).get();
  
  if (callerDoc.data()?.role !== 'SUPER_ADMIN') {
    throw new functions.https.HttpsError('permission-denied', 'Only Super Admin can update roles');
  }

  const { targetUserUid, newRole } = data;
  const validRoles = ['SUPER_ADMIN', 'MANAGER', 'OWNER', 'TENANT', 'OFFICE_STAFF', 'PLUMBER', 'GUARD'];

  if (!validRoles.includes(newRole)) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid role');
  }

  await admin.firestore().collection('users').doc(targetUserUid).update({
    role: newRole,
    updatedAt: new Date().toISOString(),
  });

  return { success: true, message: 'Role updated successfully' };
});

/**
 * Deployment Instructions:
 * 
 * 1. Install Firebase CLI: npm install -g firebase-tools
 * 2. Initialize: firebase init functions
 * 3. Copy this code to functions/index.js
 * 4. Deploy: firebase deploy --only functions
 * 
 * Note: Also deploy firestore rules:
 * firebase deploy --only firestore:rules
 */