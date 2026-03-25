import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

// Global styles
const style = document.createElement('style')
style.textContent = `
  *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
  html, body, #root {
    width: 100%; min-height: 100vh;
    background: #0A0908;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
`
document.head.appendChild(style)

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
