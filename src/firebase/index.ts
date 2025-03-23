import { firebaseConfig } from '@/config';
import { Capacitor } from '@capacitor/core';
import { getApp, initializeApp } from 'firebase/app';
import { getAuth, indexedDBLocalPersistence, initializeAuth } from 'firebase/auth';
import { get, getDatabase, ref } from 'firebase/database';
import { getFirestore } from 'firebase/firestore';
import { getStorage, listAll, ref as storageRef } from 'firebase/storage';

// Initialize Firebase
const firebaseApp = initializeApp(firebaseConfig);

const provideAuth = () => {
  if (Capacitor.isNativePlatform()) {
    return initializeAuth(getApp(), {
      persistence: indexedDBLocalPersistence,
    });
  } else {
    return getAuth();
  }
};

// Authentication init
const auth = provideAuth();

// Firestore Database init
const firestore = getFirestore(firebaseApp);

// Realtime Database init
const database = getDatabase(firebaseApp);
const dbRef = (path: string) => ref(database, path);
// Storage init
const storage = getStorage(firebaseApp);

// Logout
const logout = async () => {
  await auth.signOut();
};

// Get User role
const getUserRole = async (uid: string) => {
  const data = await get(ref(database, `users/role/${uid}`));
  if (data.exists()) return data.val();
  else return null;
};

// Get document data
const getRefData = async (path: string) => {
  const data = await get(ref(database, path));
  return data.val();
};

const getAllFromStorage = async (path: string) => {
  const docRef = storageRef(storage, path);
  const docList = await listAll(docRef);

  return docList;
};

export {
  auth,
  database,
  dbRef,
  firestore,
  // Storage
  getAllFromStorage,
  getRefData,
  // Firestore
  getUserRole,
  // Authentication
  logout,
  storage,
};
