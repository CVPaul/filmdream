import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Gallery from './pages/Gallery'
import Characters from './pages/Characters'
import Story from './pages/Story'
import Scenes from './pages/Scenes'
import SceneFlow from './pages/SceneFlow'
import Timeline from './pages/Timeline'
import Compositor from './pages/Compositor'
import Techniques from './pages/Techniques'
import ComfyExport from './pages/ComfyExport'
import Voiceover from './pages/Voiceover'
import Chat from './pages/Chat'
import Assets3D from './pages/Assets3D'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="gallery" element={<Gallery />} />
        <Route path="characters" element={<Characters />} />
        <Route path="story" element={<Story />} />
        <Route path="scenes" element={<Scenes />} />
        <Route path="scene-flow" element={<SceneFlow />} />
        <Route path="timeline" element={<Timeline />} />
        <Route path="voiceover" element={<Voiceover />} />
        <Route path="compositor" element={<Compositor />} />
        <Route path="techniques" element={<Techniques />} />
        <Route path="export" element={<ComfyExport />} />
        <Route path="chat" element={<Chat />} />
        <Route path="assets3d" element={<Assets3D />} />
      </Route>
    </Routes>
  )
}

export default App
