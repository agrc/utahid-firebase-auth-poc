import functions from "firebase-functions"
import init from 'utahid-firebase-auth-back';
import express from 'express';
import secrets from './secrets.json';


const app = express();

const {secureEndpoint} = init(app, secrets.clientSecret, secrets.clientId, 'http://localhost:5000', 'http://localhost:5000');

app.get('/secured', secureEndpoint(), (request, response) => {
  response.send('test');
});

export const api = functions.https.onRequest(app);
