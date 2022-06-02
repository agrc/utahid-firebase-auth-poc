import functions from "firebase-functions"
import secrets from './secrets.js';
import initProxy from 'firebase-auth-arcgis-server-proxy';


export const test = functions.https.onCall((data, context) => {
  if (context.auth) {
    return {
      message: 'test successful',
      user: context.auth
    }
  }

  throw new functions.https.HttpsError('unauthenticated', 'You must be logged in to use this function');
});

const options = {
  arcgisServer: {
    username: secrets.arcgisServer.username,
    password: secrets.arcgisServer.password,
    host: 'https://mapserv.utah.gov'
  },
  mappings: [
    [/^\/service1/, '/arcgis/rest/services/BBEcon/MapService/MapServer'],
    [/^\/service2/, '/arcgis/rest/services/DEQEnviro/MapService/MapServer'],
    [/^\/secured/, '/arcgis/rest/services/DEQEnviro/Secure/MapServer'],
  ]
};
// naming this endpoint "mapserver" messed up the arcgis js api requests
export const maps = functions.https.onRequest(initProxy(options));
