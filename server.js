import express from 'express'
import cors from 'cors';
import bodyparser from 'body-parser'
import dotenv from 'dotenv'

dotenv.config();

const app = express()
const port = 3000

app.use(bodyparser.json())
app.use(cors())


import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: "hacker-s-portal.firebaseapp.com",
  projectId: "hacker-s-portal",
  storageBucket: "hacker-s-portal.appspot.com",
  messagingSenderId: "848457459024",
  appId: "1:848457459024:web:7ed2c2dcd7624d39a03855",
  measurementId: "G-3D11Q02VRT"
};

// Initialize Firebase

const firebaseApp = firebase.initializeApp(firebaseConfig);
const db = firebaseApp.firestore();








app.get('/', async(req, res) => {
    const data = [];
    const snapshot = await db.collection('hackathons').get();
    snapshot.forEach(doc =>{
        data.push({"id":doc.id,"data":doc.data()})
    })
    res.json(data)
})

app.get('/user', async(req, res) => {
  const data = [];
  const snapshot = await db.collection('users').get();
  snapshot.forEach(doc =>{
      data.push({"id":doc.id,"data":doc.data()})
  })
  res.json(data)
})

app.get('/userpoints:slug', async(req, res) => {
  const data = ((req.params.slug).split(':'))[1];
  const snapshot = await db.collection('users').doc(data).get();
  if(snapshot.data()){
    const data2 = await (snapshot.data()).points;
    res.json({"points": data2})
  }
  else{
    res.json({"points": 0})
  }
  
})

app.post('/form:slug', async(req, res) => {
    const data = req.body;
    const collection = db.collection('hackathons');
    const doc = collection.doc(((req.params.slug).split(':'))[1]);
    await doc.collection('teams').doc(data.teamname).set({"teamname":data.teamname,"leader":data.leader,"members":[],"project":data.project,"idea":data.idea,"feedback":"","position":'',"link":""})

    const collection2 = db.collection('users');
    const doc2 = collection2.doc(data.leader)
    
    const snapshot = await doc2.get()
    const data2 = (snapshot.data()).hackathons;
    data2.push(((req.params.slug).split(':'))[1])
    

    await doc2.update({
      hackathons : data2,
    })
    res.send('success')

})

app.post('/user', async(req, res) => {
  const data = req.body;
    const collection2 = db.collection('users');
    const doc2 = collection2.doc(data.name)
    await doc2.set({
      hackathons : [],
      points:0,
    })
    res.send('success')

})

app.post('/add', async(req, res) => {
  const data = req.body;
  // data - name teamname id
    const collection = db.collection('hackathons');
    const doc = collection.doc(data.id);
    const team = await doc.collection('teams').doc(data.teamname).get()
    const members = team.data().members;
    members.push(data.name);
    await doc.collection('teams').doc(data.teamname).update({
      members : members,
    })

    const collection2 = db.collection('users');
    const doc2 = collection2.doc(data.name)
    
    const snapshot = await doc2.get()
    const data2 = (snapshot.data()).hackathons;
    data2.push(data.id)
    

    await doc2.update({
      hackathons : data2,
    })
    res.send('success')

})

app.post('/sub', async(req, res) => {
  const data = req.body;
  // data - name teamname id
    const collection = db.collection('hackathons');
    const doc = collection.doc(data.id);
    await doc.collection('teams').doc(data.teamname).update(
      {
        'link':data.link
      }
    )
    
    res.send('success');
})


app.get('/chkusr:slug:sec', async(req, res) => {
  const data = ((req.params.sec).split(':'))[1];
  var vad = 0;
  
    const collection = db.collection('users');
    const snapshot = await collection.doc(data).get();
  if(snapshot.data()){
    const data2 = await (snapshot.data()).hackathons;
    for (var i = 0; i < data2.length; i++) {
      if (data2[i] == ((req.params.sec).split(':'))[0]) {

        vad = 1;
        break

      }
      

    }
  }
  else{
    vad = 2;
  }
    if(vad == 1){
      res.json({"value":'1'});
    }
    else if(vad == 2){
      res.json({"value":'2'});
    }
    else{
      res.json({"value":'0'});
    }
    
})

app.get('/teaminfo:slug', async (req, res) => {
  try {
    const name = ((req.params.slug).split(':'))[1];
    const collection = db.collection('hackathons');
    const snap = await collection.get();

    const promises = snap.docs.map(async (hackathon) => {
      const doc2 = db.collection('hackathons').doc(hackathon.id);
      const snapshot = await doc2.collection('teams').get();

      return snapshot.docs
        .filter(doc => ((name === doc.data().leader) || (name === doc.data().members.filter(member =>name === member)[0])))
        .map(doc => ({
          id: hackathon.data().title,
          h_id: hackathon.id,
          data: doc.data()
        }));
    });

    const results = await Promise.all(promises);
    const data = results.flat(); // Flatten the array of arrays

    res.json(data);
  } catch (error) {
    console.error("Error fetching team info:", error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});



app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
