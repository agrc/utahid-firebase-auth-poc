import functions from "firebase-functions"
import express from 'express';
import cors from 'cors';
import { createProxyMiddleware } from 'http-proxy-middleware';
import got from 'got';
import admin from 'firebase-admin';
import secrets from './secrets.js';

admin.initializeApp();

export const test = functions.https.onCall((data, context) => {
  console.log('user', context.auth);

  if (context.auth) {
    return {
      message: 'test successful',
      user: context.auth.uid
    }
  }

  throw new functions.https.HttpsError('unauthenticated', 'You must be logged in to use this function');
});

const app = express();
app.use(cors());

let tokenInfo;
async function getToken() {
  console.log('requesting new token');
  const response = await got.post('https://mapserv.utah.gov/arcgis/tokens/generateToken', {
    form: {
      username: secrets.arcgisServer.username,
      password: secrets.arcgisServer.password,
      f: 'json',
      client: 'referer',
      referer: 'http://arcgisproxy',
      expiration: 60,
    }
  }).json();

  return response;
}

function isTokenExpired(expires) {
  return expires + (1000 * 60 * 5) < Date.now();
}

async function pathRewrite(path, request) {
  let newPath;
  newPath = path.replace(/^\/service1/, '/arcgis/rest/services/BBEcon/MapService/MapServer');
  newPath = path.replace(/^\/service2/, '/arcgis/rest/services/DEQEnviro/MapService/MapServer');
  newPath = path.replace(/^\/secured/, '/arcgis/rest/services/DEQEnviro/Secure/MapServer');

  if (!tokenInfo || isTokenExpired(tokenInfo.expires)) {
    tokenInfo = await getToken();
  }

  const uri = new URL(newPath, 'http://dummy');
  const params = new URLSearchParams(uri.search);
  params.append('token', tokenInfo.token);

  return `${uri.pathname}?${params}`;
};

const options = {
  target: 'https://mapserv.utah.gov',
  changeOrigin: true,
  pathRewrite,
  logLevel: 'debug',
  logger: console,
  onProxyReq: (proxyReq) => {
    proxyReq.setHeader('referer', 'http://arcgisproxy');
    proxyReq.setHeader('Authorization', null);
  },
};

const validateFirebaseIdToken = async (req, res, next) => {
  functions.logger.log('Check if request is authorized with Firebase ID token');

  if (!req.headers.authorization || !req.headers.authorization.startsWith('Bearer ')) {
    functions.logger.error(
      'No Firebase ID token was passed as a Bearer token in the Authorization header.',
      'Make sure you authorize your request by providing the following HTTP header:',
      'Authorization: Bearer <Firebase ID Token>',
      'or by passing a "__session" cookie.'
    );
    res.status(403).send('Unauthorized');
    return;
  }

  const idToken = req.headers.authorization.split('Bearer ')[1];

  try {
    const decodedIdToken = await admin.auth().verifyIdToken(idToken);
    functions.logger.log('ID Token correctly decoded', decodedIdToken);
    req.user = decodedIdToken;
    next();
    return;

  } catch (error) {
    functions.logger.error('Error while verifying Firebase ID token:', error);
    res.status(403).send('Unauthorized');
    return;

  }
};

app.use(validateFirebaseIdToken);
app.use(createProxyMiddleware(options));

// naming this endpoint "mapserver" messed up the arcgis js api requests
export const maps = functions.https.onRequest(app);
