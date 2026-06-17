import type { Rol } from '@/types/database.types'

export interface NavItemSerializable {
  label: string
  href: string
  iconName: string
  roles: Rol[]
  children?: NavItemSerializable[]
}

export const navigation: NavItemSerializable[] = [
  {
    label: 'Inicio',
    href: '/dashboard',
    iconName: 'LayoutDashboard',
    roles: ['admin', 'director', 'tesorero', 'operario', 'visualizador'],
  },
  {
    label: 'Solicitudes de compra',
    href: '/requisiciones',
    iconName: 'FileText',
    roles: ['admin', 'director', 'tesorero', 'operario', 'visualizador'],
  },
  {
    label: 'Aprobaciones',
    href: '/aprobaciones',
    iconName: 'CheckCircle',
    roles: ['admin', 'director'],
  },
  {
    label: 'Pagos',
    href: '/pagos',
    iconName: 'CreditCard',
    roles: ['admin', 'tesorero'],
  },
  {
    label: 'Facturas',
    href: '/facturas',
    iconName: 'Receipt',
    roles: ['admin', 'tesorero', 'operario'],
  },
  {
    label: 'Reportes',
    href: '/reportes',
    iconName: 'BarChart3',
    roles: ['admin', 'director', 'tesorero', 'visualizador'],
  },
  {
    label: 'Notificaciones',
    href: '/notificaciones',
    iconName: 'Bell',
    roles: ['admin', 'director', 'tesorero', 'operario', 'visualizador'],
  },
  {
    label: 'Administracion',
    href: '/admin',
    iconName: 'Settings',
    roles: ['admin'],
    children: [
      {
        label: 'Empresas',
        href: '/admin/catalogos/empresas',
        iconName: 'Building2',
        roles: ['admin'],
      },
      {
        label: 'Proyectos',
        href: '/admin/catalogos/proyectos',
        iconName: 'FolderKanban',
        roles: ['admin'],
      },
      {
        label: 'Proveedores',
        href: '/admin/catalogos/proveedores',
        iconName: 'Users',
        roles: ['admin'],
      },
      {
        label: 'Clasificaciones',
        href: '/admin/catalogos/clasificaciones',
        iconName: 'Tags',
        roles: ['admin'],
      },
      {
        label: 'Bancos',
        href: '/admin/catalogos/bancos',
        iconName: 'Landmark',
        roles: ['admin'],
      },
      {
        label: 'Usuarios',
        href: '/admin/usuarios',
        iconName: 'Users',
        roles: ['admin'],
      },
    ],
  },
]

export function getNavigationForRole(rol: Rol): NavItemSerializable[] {
  return navigation
    .filter((item) => item.roles.includes(rol))
    .map((item) => ({
      ...item,
      children: item.children?.filter((child) => child.roles.includes(rol)),
    }))
}
