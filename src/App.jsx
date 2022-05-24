import { useRef, useEffect, useState} from 'react'
import './App.css'
import { initializeApp } from 'firebase/app';
import { getAuth, OAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from 'firebase/auth';
import secrets from './secrets';

function App() {
  const authRef = useRef(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const firebaseApp = initializeApp(secrets.firebaseConfig);
    const auth = getAuth(firebaseApp);

    authRef.current = auth;

    onAuthStateChanged(auth, user => {
      setUser(user);
    });
  }, []);

  const logIn = async () => {
    const provider = new OAuthProvider('oidc.utahid');

    const result = await signInWithPopup(authRef.current, provider);

    console.log('result', result);
  };

  const makeSecureRequest = async () => {
    const secureResult = await fetch('/test');

    console.log('secureResult', await secureResult.text());
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>UtahID auth via Firebase POC</h1>
        <p>
          {user ? user.email : 'not logged in'}
        </p>
        <p>
          <button type="button" onClick={logIn}>
            login
          </button>
        </p>
        <p>
          <button type="button" onClick={() => signOut(authRef.current)}>
            logout
          </button>
        </p>
        <p>
          <button type='button' onClick={makeSecureRequest}>
            make secure request
          </button>
        </p>
      </header>
    </div>
  )
}

export default App
