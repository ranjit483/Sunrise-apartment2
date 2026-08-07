"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = exports.auth = exports.app = void 0;
var app_1 = require("firebase/app");
var auth_1 = require("firebase/auth");
var firestore_1 = require("firebase/firestore");
var firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};
var app = (0, app_1.getApps)().length > 0 ? (0, app_1.getApps)()[0] : (0, app_1.initializeApp)(firebaseConfig);
exports.app = app;
var auth = (0, auth_1.getAuth)(app);
exports.auth = auth;
var db = (0, firestore_1.getFirestore)(app);
exports.db = db;
