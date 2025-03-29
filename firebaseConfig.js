// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBC_UYOHLp9JxBeDvi6Hu73QzmkbIEThdI",
  authDomain: "shankho-blogsite-starter.firebaseapp.com",
  projectId: "shankho-blogsite-starter",
  storageBucket: "shankho-blogsite-starter.firebasestorage.app",
  messagingSenderId: "72411320151",
  appId: "1:72411320151:web:c6d7af765858884349b812",
  measurementId: "G-7BFY3G1M70"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
