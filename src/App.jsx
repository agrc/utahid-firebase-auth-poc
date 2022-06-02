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
  const interceptor = useRef();
  const mapRef = useRef();

  const initMap = () => {
    console.log('initMap');
    require([
      "esri/config",
      "esri/Map",
      "esri/views/MapView",

      "esri/layers/FeatureLayer"

    ], function(esriConfig,Map, MapView, FeatureLayer) {
      if (mapRef.current) {
        mapRef.current.destroy();
      }

      if (interceptor.current) {
        esriConfig.request.interceptors.push(interceptor.current);
      }

      const map = new Map({
        basemap: "streets"
      });

      const view = new MapView({
        container: "mapDiv",
        map: map,
        center: [-112.60543,39.02700],
        zoom: 8
      });

      mapRef.current = view;

      const secured = new FeatureLayer({
        url: "http://localhost:5001/ut-dts-agrc-poc-utahid-fb-dev/us-central1/maps/secured/1"
      });

      map.add(secured);
    });
  };

  useEffect(() => {
    if (user) {
      interceptor.current = {
        urls: /secured/,
        before: (params) => {
          params.requestOptions.headers = {Authorization: `Bearer ${user.accessToken}`};
        }
      }
    }

    initMap();
  }, [user]);

  useEffect(() => {
    initializeApp(secrets.firebaseConfig);
    const functions = getFunctions();
    const auth = getAuth();

    if (import.meta.env.DEV) {
      // comment out this line and the auth emulator config in firebase.json to point at utahid and firebase project
      connectAuthEmulator(auth, 'http://localhost:9099');
      connectFunctionsEmulator(functions, 'localhost', 3000);
    }

    authRef.current = auth;

    functionsRef.current = functions;

    onAuthStateChanged(auth, user => {
      console.log('user', user);
      setUser(user);
    });
  }, []);

  const logIn = async () => {
    const provider = new OAuthProvider('oidc.utahid');
    provider.addScope('app:DWRElectroFishing');
    provider.addScope('app:public');

    const result = await signInWithPopup(authRef.current, provider);

    console.log('result', result);
  };

  const makeSecureRequest = async () => {
    const callable = httpsCallable(functionsRef.current, 'test');
    const secureResult = await callable({hello: 'test'});

    console.log('secureResult', secureResult);
  };

  const makeMapServerRequest = async () => {
    const response = await fetch('http://localhost:5001/ut-dts-agrc-poc-utahid-fb-dev/us-central1/maps/secured/1?f=json', {
      headers: {
        Authorization: `Bearer ${await user.accessToken}`
      }
    });

    console.log('response', await response.text());
  };

  return (
    <div>
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
      <p>
        <button type='button' onClick={makeMapServerRequest}>
          map server request
        </button>
      </p>

    </div>
  )
}

export default App
