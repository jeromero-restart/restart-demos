import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import Layout from './components/Layout'
import CameraSelectionPage from './pages/CameraSelectionPage'
import CameraConfigPage from './pages/CameraConfigPage'
import ResultsPage from './pages/ResultsPage'
import LivePage from './pages/LivePage'

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <CameraSelectionPage /> },
      { path: 'cameras/:cameraId/config', element: <CameraConfigPage /> },
      { path: 'cameras/:cameraId/results', element: <ResultsPage /> },
      { path: 'cameras/:cameraId/live', element: <LivePage /> },
    ],
  },
])

export default function App() {
  return <RouterProvider router={router} />
}
