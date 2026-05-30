import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import AdminPanelSettingsOutlined from '@mui/icons-material/AdminPanelSettingsOutlined';
import AcUnitOutlinedIcon from '@mui/icons-material/AcUnitOutlined';
import { NavLink } from 'react-router-dom';
import { EXPANDED_SIDEBAR_WIDTH, SIDEBAR_WIDTH } from '../constants/global';
import { motion } from "framer-motion";
import { AgreementSidebarNavRow } from './AgreementSidebarNavRow';
import { useAuth } from '../auth/AuthContext';

const SidebarItemsBeforeAgreement = [
  { icon: <HomeOutlinedIcon sx={{ fontSize: 20 }} />, label: 'Dashboard', href: '/' },
];

const SidebarItemsAfterAgreement = [
  { icon: <AcUnitOutlinedIcon sx={{ fontSize: 20 }} />, label: 'Clause', href: '/clauses' },
  { icon: <SettingsOutlinedIcon sx={{ fontSize: 20 }} />, label: 'Configure', href: '/configure' },
];

interface SidebarProps {
  expanded: boolean
}

export default function Sidebar({ expanded }: SidebarProps) {
  const { user } = useAuth();
  return (
    <motion.aside
      className={`fixed top-11 left-0 bottom-0 flex flex-col bg-primary-500 border-r z-[90] overflow-hidden border-none`}
      initial={false}
      animate={{
        width: expanded ? EXPANDED_SIDEBAR_WIDTH : SIDEBAR_WIDTH
      }}
      transition={{
        duration: 0.3,
        ease: 'linear'
      }}
    >
      <nav className="flex flex-1 flex-col gap-3.5 py-3 px-2 overflow-y-auto">
        {SidebarItemsBeforeAgreement.map((item) => (
          <NavLink
            key={item.label}
            to={item.href}
            end={item.href === '/'}
            title={!expanded ? item.label : undefined}
            className={({ isActive }) =>
              `flex items-center gap-3 no-underline rounded transition-colors ${expanded ? 'py-1.5 px-2' : 'justify-center py-1.5 px-2'} ${
                isActive ? 'text-white bg-white/20' : 'text-white/70 hover:text-white hover:bg-white/20'
              }`
            }
          >
            <span className="flex items-center justify-center shrink-0">
              {item.icon}
            </span>
            {expanded && <span className="whitespace-nowrap text-sm">{item.label}</span>}
          </NavLink>
        ))}
        <AgreementSidebarNavRow expanded={expanded} />
        {SidebarItemsAfterAgreement.map((item) => (
          <NavLink
            key={item.label}
            to={item.href}
            end={item.href === '/'}
            title={!expanded ? item.label : undefined}
            className={({ isActive }) =>
              `flex items-center gap-3 no-underline rounded transition-colors ${expanded ? 'py-1.5 px-2' : 'justify-center py-1.5 px-2'} ${
                isActive ? 'text-white bg-white/20' : 'text-white/70 hover:text-white hover:bg-white/20'
              }`
            }
          >
            <span className="flex items-center justify-center shrink-0">
              {item.icon}
            </span>
            {expanded && <span className="whitespace-nowrap text-sm">{item.label}</span>}
          </NavLink>
        ))}
        {user?.isAdmin && (
          <NavLink
            to="/settings"
            title={!expanded ? 'Settings' : undefined}
            className={({ isActive }) =>
              `flex items-center gap-3 no-underline rounded transition-colors ${expanded ? 'py-1.5 px-2' : 'justify-center py-1.5 px-2'} ${
                isActive ? 'text-white bg-white/20' : 'text-white/70 hover:text-white hover:bg-white/20'
              }`
            }
          >
            <span className="flex items-center justify-center shrink-0">
              <AdminPanelSettingsOutlined sx={{ fontSize: 20 }} />
            </span>
            {expanded && <span className="whitespace-nowrap text-sm">Settings</span>}
          </NavLink>
        )}
      </nav>
    </motion.aside>
  )
}
