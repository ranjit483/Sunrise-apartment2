/**
 * Create Super Admin using Firebase Admin SDK
 * This bypasses Firestore security rules
 */

const admin = require('firebase-admin');

// Service account from Firebase Console
const serviceAccount = {
  type: "service_account",
  project_id: "sunrise-appartmant",
  private_key_id: "YOUR_PRIVATE_KEY_ID",
  private_key: "YOUR_PRIVATE_KEY",
  client_email: "firebase-adminsdk@your-project.iam.gserviceaccount.com",
  client_id: "YOUR_CLIENT_ID",
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk%40your-project.iam.gserviceaccount.com"
};

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

async function createSuperAdmin() {
  const email = "ranjitmanaraja@gmail.com";
  const password = "1234@manaR#";

  try {
    // First check if user exists
    let userRecord;
    try {
      userRecord = await admin.auth().getUserByEmail(email);
      console.log("User already exists:", userRecord.uid);
    } catch (e) {
      // User doesn't exist, create new
      userRecord = await admin.auth().createUser({
        email: email,
        password: password,
        displayName: "Super Admin"
      });
      console.log("Created new user:", userRecord.uid);
    }

    // Set custom claims for Super Admin
    await admin.auth().setCustomUserClaims(userRecord.uid, {
      role: 'SUPER_ADMIN'
    });

    // Add to Firestore with admin bypass
    const db = admin.firestore();
    await db.collection('users').doc(userRecord.uid).set({
      uid: userRecord.uid,
      email: email,
      fullName: "Super Admin",
      phone: "9841234567",
      role: "SUPER_ADMIN",
      status: "approved",
      unitNumber: null,
      profileImage: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      approvedBy: userRecord.uid,
      approvedAt: new Date().toISOString()
    });

    console.log("\n✅ Super Admin created successfully!");
    console.log("UID:", userRecord.uid);
    console.log("Email:", email);
    console.log("Role: SUPER_ADMIN");
    console.log("Status: approved");

  } catch (error) {
    console.error("Error:", error.message);
  }
}

createSuperAdmin();