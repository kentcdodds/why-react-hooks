import React from 'react'
import {withGeoPosition} from 'react-fns'
import * as firebase from './firebase'

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

class App extends React.Component {
  static defaultProps = {
    latitude: 40,
    longitude: -111,
  }
  state = {
    username: window.localStorage.getItem(
      'geo-chat:username',
    ),
    messages: [],
    seenNodes: [],
    isStuck: true,
  }
  messagesContainerRef = React.createRef()
  sendMessage = e => {
    e.preventDefault()
    firebase.addMessage({
      latitude: this.props.latitude,
      longitude: this.props.longitude,
      username: this.state.username || 'anonymous',
      content: e.target.elements.message.value,
    })
    e.target.elements.message.value = ''
    e.target.elements.message.focus()
  }
  componentDidMount() {
    this.trackVisibleChildren()
    this.trackStuck()
    this.updateDocumentTitle()
    this.subscribeToFirebase()
  }
  componentDidUpdate(prevProps, prevState) {
    this.trackVisibleChildren()
    if (
      this.state.messages.length !== prevState.messages &&
      this.state.isStuck
    ) {
      this.stickContainer()
    }
    this.updateDocumentTitle()
    if (
      prevProps.longitude !== this.props.longitude ||
      prevProps.latitude !== this.props.latitude
    ) {
      this.unsubscribeFromFirebase()
      this.subscribeToFirebase()
    }
  }
  updateDocumentTitle() {
    const unreadCount =
      this.state.messages.length -
      this.state.seenNodes.length
    document.title = unreadCount
      ? `Unread: ${unreadCount}`
      : 'All read'
    console.log(document.title)
  }
  stickContainer() {
    this.messagesContainerRef.current.scrollTop = this.messagesContainerRef.current.scrollHeight
  }
  subscribeToFirebase() {
    const {latitude, longitude} = this.props
    this.unsubscribeFromFirebase = firebase.subscribe(
      {latitude, longitude},
      messages => {
        this.setState({messages: messages})
      },
    )
  }
  trackStuck() {
    const handleScroll = () => {
      const {
        clientHeight,
        scrollTop,
        scrollHeight,
      } = this.messagesContainerRef.current
      const partialPixelBuffer = 10
      const scrolledUp =
        clientHeight + scrollTop <
        scrollHeight - partialPixelBuffer
      console.log(scrolledUp)
      this.setState({isStuck: !scrolledUp})
    }
    this.messagesContainerRef.current.addEventListener(
      'scroll',
      handleScroll,
    )
    this.untrackStuck = () =>
      this.messagesContainerRef.current.removeEventListener(
        'scroll',
        handleScroll,
      )
  }
  trackVisibleChildren() {
    const newVisibleChildren = Array.from(
      this.messagesContainerRef.current.children,
    )
      .filter(n => !this.state.seenNodes.includes(n))
      .filter(n =>
        checkInView(n, this.messagesContainerRef.current),
      )
    if (newVisibleChildren.length) {
      this.setState(({seenNodes}) => ({
        seenNodes: Array.from(
          new Set([...seenNodes, ...newVisibleChildren]),
        ),
      }))
    }
  }
  handleUsernameChange = e => {
    const username = e.target.value
    this.setState({username})
    window.localStorage.setItem(
      'geo-chat:username',
      username,
    )
  }
  componentWillUnmount() {
    this.untrackStuck()
    this.unsubscribeFromFirebase()
  }
  render() {
    const {latitude, longitude} = this.props
    return (
      <div>
        <label htmlFor="username">Username</label>
        <input
          type="text"
          id="username"
          value={this.state.username}
          onChange={this.handleUsernameChange}
        />
        <form onSubmit={this.sendMessage}>
          <label htmlFor="message">Message</label>
          <input type="text" id="message" />
          <button type="submit">send</button>
        </form>
        <pre>
          {JSON.stringify({latitude, longitude}, null, 2)}
        </pre>
        <div
          id="messagesContainer"
          ref={this.messagesContainerRef}
          style={{
            border: '1px solid',
            height: 200,
            overflowY: 'scroll',
            padding: '10px 20px',
            borderRadius: 6,
          }}
        >
          {this.state.messages.map(message => (
            <div key={message.id}>
              <strong>{message.username}</strong>:{' '}
              {message.content}
            </div>
          ))}
        </div>
      </div>
    )
  }
}

export default withGeoPosition(
  ({isLoading, coords, error}) =>
    isLoading ? (
      'loading...'
    ) : error ? (
      'there was an error'
    ) : (
      <App {...coords} />
    ),
)
