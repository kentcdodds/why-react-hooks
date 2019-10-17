import React, {useEffect, useState, useRef} from 'react'
import * as firebase from './firebase'

function useGeoPosition(options) {
  const [position, setPosition] = useState(
    getInitialPosition(options),
  )
  const [error, setError] = useState(null)

  if (error) {
    // clear out the error
    setError(null)
    // let the error boundary catch this
    throw error
  }

  useEffect(() => {
    const watch = navigator.geolocation.watchPosition(
      setPosition,
      setError,
      options,
    )

    return () => navigator.geolocation.clearWatch(watch)
  }, [options])

  return position
}

function useStickyScrollContainer(
  scrollContainerRef,
  inputs = [],
) {
  const [isStuck, setStuck] = useState(true)
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current
    function handleScroll() {
      const {
        clientHeight,
        scrollTop,
        scrollHeight,
      } = scrollContainer
      const partialPixelBuffer = 10
      const scrolledUp =
        clientHeight + scrollTop <
        scrollHeight - partialPixelBuffer
      setStuck(!scrolledUp)
    }
    scrollContainer.addEventListener('scroll', handleScroll)
    return () =>
      scrollContainer.removeEventListener(
        'scroll',
        handleScroll,
      )
  }, [scrollContainerRef])

  const scrollHeight = scrollContainerRef.current
    ? scrollContainerRef.current.scrollHeight
    : 0

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current
    if (isStuck) {
      scrollContainer.scrollTop = scrollHeight
    }
  }, [isStuck, scrollContainerRef, scrollHeight, ...inputs])

  return isStuck
}

function checkInView(
  element,
  container = element.parentElement,
) {
  const cTop = container.scrollTop
  const cBottom = cTop + container.clientHeight
  const eTop = element.offsetTop - container.offsetTop
  const eBottom = eTop + element.clientHeight
  const isTotal = eTop >= cTop && eBottom <= cBottom
  const isPartial =
    (eTop < cTop && eBottom > cTop) ||
    (eBottom > cBottom && eTop < cBottom)
  return isTotal || isPartial
}

function useVisibilityCounter(containerRef) {
  const [seenNodes, setSeenNodes] = useState([])

  useEffect(() => {
    const newVisibleChildren = Array.from(
      containerRef.current.children,
    )
      .filter(n => !seenNodes.includes(n))
      .filter(n => checkInView(n, containerRef.current))
    if (newVisibleChildren.length) {
      setSeenNodes(seen =>
        Array.from(
          new Set([...seen, ...newVisibleChildren]),
        ),
      )
    }
  }, [containerRef, seenNodes])

  return seenNodes
}

function App() {
  const {
    coords: {latitude, longitude},
  } = useGeoPosition()
  const messagesContainerRef = useRef()
  const [messages, setMessages] = useState([])
  const [username, setUsername] = useState(() =>
    window.localStorage.getItem('geo-chat:username'),
  )
  useStickyScrollContainer(messagesContainerRef, [
    messages.length,
  ])
  const visibleNodes = useVisibilityCounter(
    messagesContainerRef,
  )
  const unreadCount = messages.length - visibleNodes.length

  function sendMessage(e) {
    e.preventDefault()
    firebase.addMessage({
      latitude,
      longitude,
      username: username || 'anonymous',
      content: e.target.elements.message.value,
    })
    e.target.elements.message.value = ''
    e.target.elements.message.focus()
  }

  useEffect(() => {
    const unsubscribe = firebase.subscribe(
      {latitude, longitude},
      messages => {
        setMessages(messages)
      },
    )
    return () => {
      unsubscribe()
    }
  }, [latitude, longitude])

  useEffect(() => {
    document.title = unreadCount
      ? `Unread: ${unreadCount}`
      : 'All read'
  }, [unreadCount])

  function handleUsernameChange(e) {
    const username = e.target.value
    setUsername(username)
    window.localStorage.setItem(
      'geo-chat:username',
      username,
    )
  }

  return (
    <div>
      <label htmlFor="username">Username</label>
      <input
        type="text"
        id="username"
        value={username}
        onChange={handleUsernameChange}
      />
      <form onSubmit={sendMessage}>
        <label htmlFor="message">Message</label>
        <input type="text" id="message" />
        <button type="submit">send</button>
      </form>
      <pre>
        {JSON.stringify({latitude, longitude}, null, 2)}
      </pre>
      <div
        id="messagesContainer"
        ref={messagesContainerRef}
        style={{
          border: '1px solid',
          height: 200,
          overflowY: 'scroll',
          padding: '10px 20px',
          borderRadius: 6,
        }}
      >
        {messages.map(message => (
          <div key={message.id}>
            <strong>{message.username}</strong>:{' '}
            {message.content}
          </div>
        ))}
      </div>
    </div>
  )
}

let initialPosition
function getInitialPosition(options) {
  if (!initialPosition) {
    // supsense magic...
    throw new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        position => {
          initialPosition = position
          resolve(position)
        },
        error => reject(error),
        options,
      )
    })
  }
  return initialPosition
}

export default App
