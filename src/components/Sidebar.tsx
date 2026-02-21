import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';
import { EXPANDED_SIDEBAR_WIDTH, SIDEBAR_WIDTH } from '../constants/global';

const SidebarItems = [
  { icon: <HomeOutlinedIcon sx={{ fontSize: 20 }} />, label: 'Dashboard', href: '#' },
]

interface SidebarProps {
  expanded: boolean
}

export default function Sidebar({ expanded }: SidebarProps) {
  return (
    <aside
      className={`fixed top-11 left-0 bottom-0 flex flex-col bg-primary-500 border-r border-primary-400 z-[90] overflow-hidden transition-[width] duration-250 ease-[cubic-bezier(0.4,0,0.2,1)]`}
      style={{ width: expanded ? EXPANDED_SIDEBAR_WIDTH : SIDEBAR_WIDTH }}
    >
      <nav className="flex-1 py-3 px-2 overflow-y-auto">
        {SidebarItems.map((item) => (
          <a
            key={item.label}
            href={item.href}
            className={`flex items-center gap-3 text-white/70 no-underline rounded transition-colors hover:text-white hover:bg-white/20 ${expanded ? 'py-1.5 px-2 my-1.5' : 'justify-center py-1.5 px-2 my-1.5'}`}
            title={!expanded ? item.label : undefined}
          >
            <span className="flex items-center justify-center shrink-0">
              {item.icon}
            </span>
            {expanded && <span className="whitespace-nowrap text-sm">{item.label}</span>}
          </a>
        ))}
      </nav>
    </aside>
  )
}
