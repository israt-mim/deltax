import { useState } from 'react'
import Navbar from './components/Navbar'
import Sidebar from './components/Sidebar'
import { EXPANDED_SIDEBAR_WIDTH, NAVBAR_HEIGHT, SIDEBAR_WIDTH } from './constants/global'

function App() {
  const [sidebarExpanded, setSidebarExpanded] = useState(true)

  return (
    <div className="min-h-screen">
      <Navbar
        sidebarExpanded={sidebarExpanded}
        onSidebarToggle={() => setSidebarExpanded(!sidebarExpanded)}
      />
      <Sidebar expanded={sidebarExpanded} />
      <main
        className={`min-h-screen bg-white transition-[margin-left] duration-250 ease-[cubic-bezier(0.4,0,0.2,1)]`}
        style={{marginLeft: sidebarExpanded ? EXPANDED_SIDEBAR_WIDTH : SIDEBAR_WIDTH, marginTop: NAVBAR_HEIGHT}}
      >
        <div className="p-8 text-black-600">
          <h1 className="text-2xl font-semibold m-0 mb-4">Welcome to deltax</h1>
          <p className="leading-relaxed m-0">
            Your app layout with a top navbar and expandable sidebar is ready.
            Click the menu icon in the navbar to collapse or expand the sidebar.
          </p>
        </div>
      </main>
    </div>
  )
}

export default App
