import React, {Suspense} from 'react'
import ReactDOM from 'react-dom'
import App from './app'

ReactDOM.render(
  <Suspense fallback="loading...">
    <App />
  </Suspense>,
  document.getElementById('root'),
)
