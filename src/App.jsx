import { useRef, useEffect, useState} from 'react'
import './App.css'
import { initializeApp } from 'firebase/app';
import { getAuth, OAuthProvider, signInWithPopup, onAuthStateChanged, signOut, connectAuthEmulator } from 'firebase/auth';
import secrets from './secrets';
import { getFunctions, httpsCallable, connectFunctionsEmulator } from 'firebase/functions';

function App() {
  const authRef = useRef(null);
  const functionsRef = useRef(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const firebaseApp = initializeApp(secrets.firebaseConfig);
    const functions = getFunctions(firebaseApp);
    const auth = getAuth(firebaseApp);

    if (import.meta.env.DEV) {
      connectAuthEmulator(auth, 'http://localhost:9099'); // comment out to point at utahid and firebase project
      connectFunctionsEmulator(functions, 'localhost', 3000);
    }

    authRef.current = auth;

    functionsRef.current = functions;

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
    const callable = httpsCallable(functionsRef.current, 'test');
    const secureResult = await callable({hello: 'test'});

    console.log('secureResult', secureResult);
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
