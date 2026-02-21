import { useState } from 'react'
import Navbar from '../components/Navbar'
import Sidebar from '../components/Sidebar'
import { EXPANDED_SIDEBAR_WIDTH, NAVBAR_HEIGHT, SIDEBAR_WIDTH } from '../constants/global'
import { Outlet } from 'react-router-dom'

export const AppLayout = () => {
	const [sidebarExpanded, setSidebarExpanded] = useState(false)

	return (
		<div className="min-h-screen">
			<Navbar
				sidebarExpanded={sidebarExpanded}
				onSidebarToggle={() => setSidebarExpanded(!sidebarExpanded)}
			/>
			<Sidebar expanded={sidebarExpanded} />

			<main
				className={`bg-white transition-[margin-left] duration-250 ease-[cubic-bezier(0.4,0,0.2,1)]`}
				style={{ marginLeft: sidebarExpanded ? EXPANDED_SIDEBAR_WIDTH : SIDEBAR_WIDTH, paddingTop: NAVBAR_HEIGHT }}
			>
				<div className='p-6'>
					<Outlet />
				</div>
			</main>
		</div>
	)
}
