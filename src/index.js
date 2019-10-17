import 'milligram'
import React, {Suspense} from 'react'
import ErrorBoundary from 'react-error-boundary'
import ReactDOM from 'react-dom'
import App from './app'
// import App from './old-app'

function ErrorFallback(props) {
  console.error(props)
  return 'there was an error'
}

ReactDOM.render(
  <ErrorBoundary FallbackComponent={ErrorFallback}>
    <Suspense fallback="loading...">
      <App />
    </Suspense>
  </ErrorBoundary>,
  document.getElementById('root'),
)
