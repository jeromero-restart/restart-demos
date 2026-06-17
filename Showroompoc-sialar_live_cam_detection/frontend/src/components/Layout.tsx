import { Outlet, Link } from 'react-router-dom'

export default function Layout() {
  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      <nav className="bg-gray-800 px-6 py-4">
        <Link to="/" className="text-3xl font-semibold leading-none text-gray-100">
          SIALAR
        </Link>
      </nav>
      <main className="px-6 py-8">
        <Outlet />
      </main>
    </div>
  )
}
