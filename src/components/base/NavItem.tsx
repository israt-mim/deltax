export interface NavItemProps {
	children: React.ReactNode
	label: string
	onClick: () => void
}

export const NavItem = ({ children, label, onClick }: NavItemProps) => {
	return (
		<button key={label} className="flex items-center justify-center w-7 h-7 p-1 bg-transparent border-none rounded text-white/90 hover:text-white hover:bg-white/20 transition-colors cursor-pointer" aria-label={label} onClick={onClick}>
			{children}
		</button>
	)
}