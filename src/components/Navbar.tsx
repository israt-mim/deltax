import FullscreenOutlinedIcon from '@mui/icons-material/FullscreenOutlined';
import NotificationsOutlinedIcon from '@mui/icons-material/NotificationsOutlined';
import MenuOutlinedIcon from '@mui/icons-material/MenuOutlined';
import ArrowForwardIosOutlinedIcon from '@mui/icons-material/ArrowForwardIosOutlined';
import { Link } from 'react-router';
import { NavItem } from './base/NavItem';
import { NAVBAR_HEIGHT } from '../constants/global';
import type { ReactNode } from 'react';
import { Logo } from './icons/logo';
import { useBreadcrumbContext } from '../context/BreadcrumbContext';
import { NavbarUserMenu } from './NavbarUserMenu';


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
  const { items: breadcrumbItems } = useBreadcrumbContext();

  const NAVBAR_ITEMS: NavItemDetails[] = [
    {
      icon: <NotificationsOutlinedIcon sx={{ fontSize: 20 }} />,
      label: 'Notifications',
      onClick: () => {
        console.log('Notifications');
      }
    },
    {
      icon: <FullscreenOutlinedIcon sx={{ fontSize: 20 }} />,
      label: 'Fullscreen',
      onClick: () => {
        if (!document.fullscreenElement) {
          void document.documentElement.requestFullscreen();
        } else {
          void document.exitFullscreen();
        }
      }
    },
  ];

  return (
    <header className={`fixed top-0 left-0 right-0 flex items-center justify-between px-3 py-1.5 bg-primary-500 backdrop-blur-md z-[100]`} style={{ height: NAVBAR_HEIGHT }}>
      <div className="flex items-center gap-3">
        <NavItem key={'sidebar-expand-collaps-btn'} label={sidebarExpanded ? 'Collapse sidebar' : 'Expand sidebar'} onClick={onSidebarToggle}>
          <MenuOutlinedIcon sx={{ fontSize: 18, color: 'white', opacity: sidebarExpanded ? '' : '0.7' }} />
        </NavItem>
        <Logo size={80} primaryColor='#FFFFFF' secondaryColor='#CC5500' />
        {breadcrumbItems.length > 0 ? (
          <>
            <span className="text-white select-none" aria-hidden="true">|</span>
            <nav
              className="flex min-w-0 max-w-[min(52vw,640px)] items-center gap-0.5 text-sm font-semibold text-white"
              aria-label="Breadcrumb"
            >
              {breadcrumbItems.map((item, index) => {
                const crumbClass =
                  "truncate rounded-md px-2 py-0.5 text-white transition-colors";
                return (
                  <span key={`${item.label}-${index}`} className="flex min-w-0 items-center">
                    {index > 0 ? (
                      <ArrowForwardIosOutlinedIcon
                        sx={{ fontSize: 12, color: 'white', opacity: 0.85 }}
                        className="shrink-0 mx-0.5"
                        aria-hidden
                      />
                    ) : null}
                    {item.href ? (
                      <Link
                        to={item.href}
                        className={`${crumbClass} no-underline hover:bg-primary-150 hover:text-primary-900`}
                        title={item.label}
                      >
                        {item.label}
                      </Link>
                    ) : (
                      <span className={crumbClass} title={item.label}>
                        {item.label}
                      </span>
                    )}
                  </span>
                );
              })}
            </nav>
          </>
        ) : null}
      </div>

      <div className="flex items-center gap-2">
        {NAVBAR_ITEMS.map((item) => (
          <NavItem key={item.label} label={item.label} onClick={() => item.onClick()} >
            {item.icon}
          </NavItem>
        ))}
        <NavbarUserMenu />
      </div>
    </header>
  )
};