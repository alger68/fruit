import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/index.css'
import App from './App.jsx'
import SurveyApp from './survey/SurveyApp.jsx'
import AdminPage from './survey/AdminPage.jsx'

// The survey lives beside the shop: /survey for partners, /survey/admin for HQ.
const path = window.location.pathname.replace(/\/+$/, '')
const Root = path === '/survey/admin' ? AdminPage : path === '/survey' ? SurveyApp : App

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
