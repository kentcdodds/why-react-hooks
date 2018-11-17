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
  state = {messeges: [], seenNodes: [], isStuck: true}
  usernameRef = React.createRef()
  messegesContainerRef = React.createRef()
  sendMessege = e => {
    e.preventDefault()
    firebase.addMessege({
      latitude: this.props.latitude,
      longitude: this.props.longitude,
      username:
        this.usernameRef.current.value || 'anonymous',
      content: e.target.elements.messege.value,
    })
    e.target.elements.messege.value = ''
    e.target.elements.messege.focus()
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
      this.state.messeges.length !== prevState.messeges &&
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
      this.state.messeges.length -
      this.state.seenNodes.length
    document.title = unreadCount
      ? `Unread: ${unreadCount}`
      : 'All read'
    console.log(document.title)
  }
  stickContainer() {
    this.messegesContainerRef.current.scrollTop = this.messegesContainerRef.current.scrollHeight
  }
  subscribeToFirebase() {
    const {latitude, longitude} = this.props
    const unsubscribe = firebase.subscribe(
      {latitude, longitude},
      messeges => {
        this.setState({messeges: messeges})
      },
    )
    this.unsubscribeFromFirebase = unsubscribe()
  }
  trackStuck() {
    const handleScroll = () => {
      const {
        clientHeight,
        scrollTop,
        scrollHeight,
      } = this.messegesContainerRef.current
      const partialPixelBuffer = 10
      const scrolledUp =
        clientHeight + scrollTop <
        scrollHeight - partialPixelBuffer
      console.log(scrolledUp)
      this.setState({isStuck: !scrolledUp})
    }
    this.messegesContainerRef.current.addEventListener(
      'scroll',
      handleScroll,
    )
    this.untrackStuck = () =>
      this.messegesContainerRef.current.removeEventListener(
        'scroll',
        handleScroll,
      )
  }
  trackVisibleChildren() {
    const newVisibleChildren = Array.from(
      this.messegesContainerRef.current.children,
    )
      .filter(n => !this.state.seenNodes.includes(n))
      .filter(n =>
        checkInView(n, this.messegesContainerRef.current),
      )
    if (newVisibleChildren.length) {
      this.setState(({seenNodes}) => ({
        seenNodes: Array.from(
          new Set([...seenNodes, ...newVisibleChildren]),
        ),
      }))
    }
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
        <input id="username" ref={this.usernameRef} />
        <form onSubmit={this.sendMessege}>
          <label htmlFor="messege">Messege</label>
          <input id="messege" />
          <button type="submit">send</button>
        </form>
        <pre>
          {JSON.stringify({latitude, longitude}, null, 2)}
        </pre>
        <div
          id="messegesContainer"
          ref={this.messegesContainerRef}
          style={{
            border: '1px solid',
            height: 200,
            overflowY: 'scroll',
          }}
        >
          {this.state.messeges.map(messege => (
            <div key={messege.id}>
              <strong>{messege.username}</strong>:{' '}
              {messege.content}
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
