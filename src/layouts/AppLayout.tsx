import { useState } from 'react'
import Navbar from '../components/Navbar'
import Sidebar from '../components/Sidebar'
import { EXPANDED_SIDEBAR_WIDTH, NAVBAR_HEIGHT, SIDEBAR_WIDTH } from '../constants/global'
import { Outlet } from 'react-router-dom'
import { motion } from 'framer-motion'

export const AppLayout = () => {
	const [sidebarExpanded, setSidebarExpanded] = useState(false)

	return (
		<div className="min-h-screen">
			<Navbar
				sidebarExpanded={sidebarExpanded}
				onSidebarToggle={() => setSidebarExpanded(!sidebarExpanded)}
			/>
			<Sidebar expanded={sidebarExpanded} />
			<motion.div
				className='fixed bg-primary-500 w-4 h-4'
				style={{ clipPath: "polygon(0% 0%, 50% 0%, 35% 6%, 25% 12%, 18% 18%, 12% 25%, 6% 35%, 0% 50%)", top: NAVBAR_HEIGHT }}
				initial={false}
				animate={{
					left: sidebarExpanded ? EXPANDED_SIDEBAR_WIDTH : SIDEBAR_WIDTH
				}}
				transition={{
					duration: 0.3,
					ease: 'linear'
				}}
			/>
			<motion.main
				className={`bg-white`}
				style={{ paddingTop: NAVBAR_HEIGHT }}
				initial={false}
				animate={{
					marginLeft: sidebarExpanded ? EXPANDED_SIDEBAR_WIDTH : SIDEBAR_WIDTH
				}}
				transition={{
					duration: 0.3,
					ease: 'linear'
				}}
			>
				<div className='p-6'>
					<Outlet />
				</div>
			</motion.main>
		</div>
	)
}
