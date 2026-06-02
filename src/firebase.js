import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: 'AIzaSyDlGZatpd00ZtQ76JC1qdBpHdPnhHF6Kjk',
  authDomain: 'kan-social.firebaseapp.com',
  projectId: 'kan-social',
  storageBucket: 'kan-social.firebasestorage.app',
  messagingSenderId: '111695937662',
  appId: '1:111695937262:web:35eacb4b779057a719d82f',
  measurementId: 'G-G7TK948R30',
  databaseURL: 'https://kan-social-default-rtdb.europe-west1.firebasedatabase.app',
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
