import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AppProvider } from './context/AppContext'
import Header from './components/Header'
import Dashboard from './pages/Dashboard'
import BountyDetail from './pages/BountyDetail'
import Profile from './pages/Profile'

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-[#080d18] text-white" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
          <Header />
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/bounty/:id" element={<BountyDetail />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/profile/:address" element={<Profile />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </AppProvider>
  )
}
