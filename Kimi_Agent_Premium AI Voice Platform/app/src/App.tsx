import { HashRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import SDRAgent from './pages/SDRAgent'
import CloserAgent from './pages/CloserAgent'
import FollowUpAgent from './pages/FollowUpAgent'
import AppointmentAgent from './pages/AppointmentAgent'
import ReceptionistAgent from './pages/ReceptionistAgent'

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/sdr-agent" element={<SDRAgent />} />
          <Route path="/closer-agent" element={<CloserAgent />} />
          <Route path="/follow-up-agent" element={<FollowUpAgent />} />
          <Route path="/appointment-agent" element={<AppointmentAgent />} />
          <Route path="/receptionist-agent" element={<ReceptionistAgent />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}

export default App
