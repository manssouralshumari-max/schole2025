import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, Timestamp } from "firebase/firestore";

const loadEnv = () => {
  const envFiles = [".env.local", ".env"];

  for (const file of envFiles) {
    const fullPath = resolve(process.cwd(), file);
    if (!existsSync(fullPath)) continue;

    const content = readFileSync(fullPath, "utf8");
    content.split(/\r?\n/).forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) return;
      const eqIndex = trimmed.indexOf("=");
      if (eqIndex === -1) return;

      const key = trimmed.slice(0, eqIndex).trim();
      const value = trimmed.slice(eqIndex + 1).trim().replace(/^['"]|['"]$/g, "");

      if (!process.env[key]) {
        process.env[key] = value;
      }
    });
  }
};

const requiredEnvKeys = [
  "VITE_FIREBASE_API_KEY",
  "VITE_FIREBASE_AUTH_DOMAIN",
  "VITE_FIREBASE_PROJECT_ID",
  "VITE_FIREBASE_STORAGE_BUCKET",
  "VITE_FIREBASE_MESSAGING_SENDER_ID",
  "VITE_FIREBASE_APP_ID",
  "ADMIN_SEED_EMAIL",
  "ADMIN_SEED_PASSWORD",
  "ADMIN_SEED_NAME",
];

const ensureEnv = () => {
  const missing = requiredEnvKeys.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing environment variables: ${missing.join(", ")}`);
  }
};

const firebaseFetch = async (endpoint, payload) => {
  const apiKey = process.env.VITE_FIREBASE_API_KEY;
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/${endpoint}?key=${apiKey}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok) {
    const message = data?.error?.message || "Request failed";
    throw new Error(message);
  }

  return data;
};

const ensureAdminAccount = async () => {
  const email = process.env.ADMIN_SEED_EMAIL.trim().toLowerCase();
  const password = process.env.ADMIN_SEED_PASSWORD;
  const displayName = process.env.ADMIN_SEED_NAME;

  let localId = null;
  let idToken = null;
  let created = false;

  try {
    const signIn = await firebaseFetch("accounts:signInWithPassword", {
      email,
      password,
      returnSecureToken: true,
    });
    localId = signIn.localId;
    idToken = signIn.idToken;
    console.log("ℹ️ Admin account already exists. Updating profile...");
  } catch (error) {
    if (error.message === "INVALID_PASSWORD" || error.message === "EMAIL_NOT_FOUND") {
      console.log("⚠️ Admin account not found with provided credentials. Creating new account...");
      const signUp = await firebaseFetch("accounts:signUp", {
        email,
        password,
        returnSecureToken: true,
      });
      localId = signUp.localId;
      idToken = signUp.idToken;
      created = true;
    } else {
      throw error;
    }
  }

  if (displayName && idToken) {
    try {
      await firebaseFetch("accounts:update", {
        idToken,
        displayName,
        returnSecureToken: false,
      });
    } catch (error) {
      console.warn("⚠️ Failed to set display name:", error.message);
    }
  }

  const firebaseConfig = {
    apiKey: process.env.VITE_FIREBASE_API_KEY,
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.VITE_FIREBASE_APP_ID,
  };

  const app = initializeApp(firebaseConfig, "seed-admin");
  const db = getFirestore(app);

  const userDocRef = doc(db, "users", localId);
  const now = Timestamp.now();
  const payload = {
    email,
    displayName,
    role: "admin",
    updatedAt: now,
  };

  if (created) {
    payload.createdAt = now;
  }

  await setDoc(userDocRef, payload, { merge: true });

  console.log("✅ Admin account ready:");
  console.log(`   Email: ${email}`);
  console.log(`   UID: ${localId}`);
  console.log(`   Password: ${password}`);
};

const main = async () => {
  try {
    loadEnv();
    ensureEnv();
    await ensureAdminAccount();
    console.log("🎉 Admin data seed completed successfully.");
    process.exit(0);
  } catch (error) {
    console.error("❌ Admin data seed failed:", error.message || error);
    process.exit(1);
  }
};

main();





