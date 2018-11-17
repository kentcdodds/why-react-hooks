import React, {useEffect, useState, useRef} from 'react'
import {useGeoPosition} from 'the-platform'
import * as firebase from './firebase'

function useStickyScrollContainer(
  scrollContainerRef,
  inputs = [],
) {
  const [isStuck, setStuck] = useState(true)
  useEffect(() => {
    function handleScroll() {
      const {
        clientHeight,
        scrollTop,
        scrollHeight,
      } = scrollContainerRef.current
      const partialPixelBuffer = 10
      const scrolledUp =
        clientHeight + scrollTop <
        scrollHeight - partialPixelBuffer
      setStuck(!scrolledUp)
    }
    scrollContainerRef.current.addEventListener(
      'scroll',
      handleScroll,
    )
    return () =>
      scrollContainerRef.current.removeEventListener(
        'scroll',
        handleScroll,
      )
  }, [])

  useEffect(
    () => {
      if (isStuck) {
        scrollContainerRef.current.scrollTop =
          scrollContainerRef.current.scrollHeight
      }
    },
    [
      scrollContainerRef.current
        ? scrollContainerRef.current.scrollHeight
        : 0,
      ...inputs,
    ],
  )

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
  })

  return seenNodes
}

function App() {
  const {
    coords: {latitude, longitude},
  } = useGeoPosition()
  const usernameRef = useRef()
  const messegesContainerRef = useRef()
  const [messeges, setMesseges] = useState([])
  useStickyScrollContainer(messegesContainerRef, [
    messeges.length,
  ])
  const visibleNodes = useVisibilityCounter(
    messegesContainerRef,
  )
  const unreadCount = messeges.length - visibleNodes.length

  function sendMessege(e) {
    e.preventDefault()
    firebase.addMessege({
      latitude,
      longitude,
      username: usernameRef.current.value || 'anonymous',
      content: e.target.elements.messege.value,
    })
    e.target.elements.messege.value = ''
    e.target.elements.messege.focus()
  }

  useEffect(
    () => {
      const unsubscribe = firebase.subscribe(
        {latitude, longitude},
        messeges => {
          setMesseges(messeges)
        },
      )
      return () => {
        unsubscribe()
      }
    },
    [latitude, longitude],
  )

  useEffect(
    () => {
      document.title = unreadCount
        ? `Unread: ${unreadCount}`
        : 'All read'
    },
    [unreadCount],
  )

  return (
    <div>
      <label htmlFor="username">Username</label>
      <input id="username" ref={usernameRef} />
      <form onSubmit={sendMessege}>
        <label htmlFor="messege">Messege</label>
        <input id="messege" />
        <button type="submit">send</button>
      </form>
      <pre>
        {JSON.stringify({latitude, longitude}, null, 2)}
      </pre>
      <div
        id="messegesContainer"
        ref={messegesContainerRef}
        style={{
          border: '1px solid',
          height: 200,
          overflowY: 'scroll',
        }}
      >
        {messeges.map(messege => (
          <div key={messege.id}>
            <strong>{messege.username}</strong>:{' '}
            {messege.content}
          </div>
        ))}
      </div>
    </div>
  )
}

export default App
