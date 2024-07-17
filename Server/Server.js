const express = require('express');
const cors = require('cors'); // Include CORS package
const app = express();
app.use(express.json());
app.use(cors()); // Use CORS with default options

const port = process.env.PORT || 5000;
app.listen(port, () => console.log(`Server is running on port ${port}`));

const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

app.post('/save-image', async (req, res) => {
  const sphereData = req.body;
  const docRef = db.collection('art').doc('artData');
  await docRef.set(sphereData);
  res.send('Sphere data saved successfully');
});

app.get('/get-image-data', async (req, res) => {
  const docRef = db.collection('art').doc('artData');
  const doc = await docRef.get();
  if (!doc.exists) {
    res.status(404).send('No image data found');
  } else {
    res.send(doc.data());
  }
});
