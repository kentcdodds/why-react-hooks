import React from 'react'
import * as firebase from './firebase'

function App() {
  const {
    coords: {latitude, longitude},
  } = useGeoPosition()
  const messagesContainerRef = React.useRef()
  const [messages, setMessages] = React.useState([])
  const [username, setUsername] = useLocalStorageState('', {
    key: 'geo-chat:username',
  })
  useStickyScrollContainer(messagesContainerRef, [messages.length])
  const visibleNodes = useVisibilityCounter(messagesContainerRef)
  const unreadCount = messages.length - visibleNodes.length

  React.useEffect(() => {
    const unsubscribe = firebase.subscribe({latitude, longitude}, messages => {
      setMessages(messages)
    })
    return () => {
      unsubscribe()
    }
  }, [latitude, longitude])

  React.useEffect(() => {
    document.title = unreadCount ? `Unread: ${unreadCount}` : 'All read'
  }, [unreadCount])

  const initialDocumentTitle = React.useRef(document.title)
  React.useEffect(() => {
    return () => {
      document.title = initialDocumentTitle
    }
  }, [])

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

  function handleUsernameChange(e) {
    const username = e.target.value
    setUsername(username)
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
      <pre>{JSON.stringify({latitude, longitude}, null, 2)}</pre>
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
            <strong>{message.username}</strong>: {message.content}
          </div>
        ))}
      </div>
    </div>
  )
}

function useLocalStorageState(
  initialValue,
  {key, serializer = v => v, deserializer = v => v},
) {
  const [state, setState] = React.useState(
    () => deserializer(window.localStorage.getItem(key)) || initialValue,
  )

  const serializedState = serializer(state)
  React.useEffect(() => {
    window.localStorage.setItem(key, serializedState)
  }, [key, serializedState])

  return [state, setState]
}

function useGeoPosition(options) {
  const [position, setPosition] = React.useState(getInitialPosition(options))

  const setError = useErrorBoundaryError()

  React.useEffect(() => {
    const watch = navigator.geolocation.watchPosition(
      setPosition,
      setError,
      options,
    )

    return () => navigator.geolocation.clearWatch(watch)
  }, [options, setError])

  return position
}

function useStickyScrollContainer(scrollContainerRef, inputs = []) {
  const [isStuck, setStuck] = React.useState(true)
  React.useEffect(() => {
    const scrollContainer = scrollContainerRef.current
    function handleScroll() {
      const {clientHeight, scrollTop, scrollHeight} = scrollContainer
      const partialPixelBuffer = 10
      const scrolledUp =
        clientHeight + scrollTop < scrollHeight - partialPixelBuffer
      setStuck(!scrolledUp)
    }
    scrollContainer.addEventListener('scroll', handleScroll)
    return () => scrollContainer.removeEventListener('scroll', handleScroll)
  }, [scrollContainerRef])

  const scrollHeight = scrollContainerRef.current
    ? scrollContainerRef.current.scrollHeight
    : 0

  React.useEffect(() => {
    const scrollContainer = scrollContainerRef.current
    if (isStuck) {
      scrollContainer.scrollTop = scrollHeight
    }
    // ignoring this rule is dangerous and not recommended
    // but sometimes it's the only way you can create the API you want.
    // 99% of the time you should not disable this rule.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStuck, scrollContainerRef, scrollHeight, ...inputs])

  return isStuck
}

function checkInView(element, container = element.parentElement) {
  const cTop = container.scrollTop
  const cBottom = cTop + container.clientHeight
  const eTop = element.offsetTop - container.offsetTop
  const eBottom = eTop + element.clientHeight
  const isTotal = eTop >= cTop && eBottom <= cBottom
  const isPartial =
    (eTop < cTop && eBottom > cTop) || (eBottom > cBottom && eTop < cBottom)
  return isTotal || isPartial
}

function useVisibilityCounter(containerRef) {
  const [seenNodes, setSeenNodes] = React.useState([])

  React.useEffect(() => {
    const newVisibleChildren = Array.from(containerRef.current.children)
      .filter(n => !seenNodes.includes(n))
      .filter(n => checkInView(n, containerRef.current))
    if (newVisibleChildren.length) {
      setSeenNodes(seen =>
        Array.from(new Set([...seen, ...newVisibleChildren])),
      )
    }
  }, [containerRef, seenNodes])

  return seenNodes
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

function useErrorBoundaryError() {
  const [error, setError] = React.useState(null)

  if (error) {
    // clear out the error
    setError(null)
    // let the error boundary catch this
    throw error
  }

  return setError
}

export default App
