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

function addMessege({
  latitude,
  longitude,
  content,
  username,
}) {
  const locationId = getLocationId({latitude, longitude})
  firebase
    .database()
    .ref(`messeges/${locationId}/posts`)
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
  const ref = firebase
    .database()
    .ref(`messeges/${locationId}/posts`)
  console.log('registering with locationid of ', locationId)
  ref.on('value', snapshot =>
    callback(
      Object.entries(snapshot.val() || {}).map(
        ([id, data]) => ({id, ...data}),
      ),
    ),
  )
  return () => ref.off('value', callback)
}

const getLocationId = ({latitude, longitude}) =>
  `${latitude.toFixed()}-${longitude.toFixed()}`

export {subscribe, addMessege}
