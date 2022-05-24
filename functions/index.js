import functions from "firebase-functions"


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
