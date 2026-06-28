import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';

const firebaseConfig = {
  apiKey: "AIzaSyDGYnOvWTgRgC2ckRVPp0Cw5DAulq_DU24",
  authDomain: "anirban-gayen.firebaseapp.com",
  projectId: "anirban-gayen",
  appId: "115518134544"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

export const auth = firebase.auth();
export default firebase;
