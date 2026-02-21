import FullscreenOutlinedIcon from '@mui/icons-material/FullscreenOutlined';
import NotificationsOutlinedIcon from '@mui/icons-material/NotificationsOutlined';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import MenuOutlinedIcon from '@mui/icons-material/MenuOutlined';
import { NavItem } from './base/NavItem';
import { NAVBAR_HEIGHT } from '../constants/global';
import type { ReactNode } from 'react';
import  { Logo } from './icons/logo';


interface NavItemDetails {
  icon: ReactNode
  label: string
  onClick: () => void
}

interface NavbarProps {
  sidebarExpanded: boolean
  onSidebarToggle: () => void
}

export default function Navbar({ sidebarExpanded, onSidebarToggle }: NavbarProps) {

  const NAVBAR_ITEMS: NavItemDetails[] = [
    {
      icon: <NotificationsOutlinedIcon sx={{ fontSize: 20 }} />,
      label: 'Notifications',
      onClick: () => {
        console.log('Notifications');
      }
    },
    {
      icon: <SettingsOutlinedIcon sx={{ fontSize: 20 }} />,
      label: 'Settings',
      onClick: () => {
        console.log('Settings');
      }
    },
    {
      icon: <FullscreenOutlinedIcon sx={{ fontSize: 20 }} />,
      label: 'Fullscreen',
      onClick: () => {
        console.log('Fullscreen');
      }
    }
  ];

  return (
    <header className={`fixed top-0 left-0 right-0 flex items-center justify-between px-3 py-1.5 bg-primary-500 backdrop-blur-md z-[100]`} style={{ height: NAVBAR_HEIGHT }}>
      <div className="flex items-center gap-3">
        <NavItem key={'sidebar-expand-collaps-btn'} label={sidebarExpanded ? 'Collapse sidebar' : 'Expand sidebar'} onClick={onSidebarToggle}>
          <MenuOutlinedIcon sx={{ fontSize: 18, color: 'white', opacity: sidebarExpanded ? '' : '0.7' }} />
        </NavItem>
        <Logo size={80} primaryColor='#FFFFFF' secondaryColor='#182F41' />
      </div>

      <div className="flex items-center gap-2">
        {NAVBAR_ITEMS.map((item) => (
          <NavItem key={item.label} label={item.label} onClick={() => item.onClick()} >
            {item.icon}
          </NavItem>
        ))}
      </div>
    </header>
  )
};