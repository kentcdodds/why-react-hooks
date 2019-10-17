import * as firebase from 'firebase/app'
import 'firebase/database'

try {
  firebase.initializeApp({
    apiKey: 'AIzaSyCXh3HpbB_jhMNuxc1vOsDkUUCIlRBNYm0',
    authDomain: 'geo-chat-7d7c6.firebaseapp.com',
    databaseURL: 'https://geo-chat-7d7c6.firebaseio.com',
    projectId: 'geo-chat-7d7c6',
    storageBucket: '',
    messagingSenderId: '453185349176',
  })
} catch (e) {}

function addMessage({latitude, longitude, content, username}) {
  const locationId = getLocationId({latitude, longitude})
  firebase
    .database()
    .ref(`messages/${locationId}/posts`)
    .push({
      date: Date.now(),
      content,
      username,
      latitude,
      longitude,
    })
}

function subscribe({latitude, longitude}, callback) {
  const locationId = getLocationId({latitude, longitude})
  const ref = firebase.database().ref(`messages/${locationId}/posts`)
  console.log('registering with locationid of ', locationId)
  ref.on('value', snapshot =>
    callback(
      Object.entries(snapshot.val() || {}).map(([id, data]) => ({id, ...data})),
    ),
  )
  return () => ref.off('value', callback)
}

const getLocationId = ({latitude, longitude}) =>
  `${(latitude * 10).toFixed()}_${(longitude * 10).toFixed()}`

export {subscribe, addMessage}
