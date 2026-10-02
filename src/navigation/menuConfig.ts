import { PERMISSIONS } from "@/constants/permissions";
import { ROLE_GROUPS, ROLES } from "@/constants/roles";

export type MenuItemRoute =
  | "Inicio"
  | "UsuariosDelSistema"
  | "Prestaciones"
  | "AgrupacionEspecialidades"
  | "VinculosEMR"
  | "VinculosTMInformante"
  | "Caja"
  | "MantenedorGrupos"
  | "RolesPermisos"
  | "AuditoriaPermisos"
  | "BoxPantalla"
  | "MantenedorPantallas"
  | "GestionTotem"
  | "Interfaces"
  | "Financiadores"
  | "TiposPago"
  | "MetodosPago"
  | "RelacionPagos";

export type DrawerMenuItem = {
  id: string;
  label: string;
  route: MenuItemRoute;
  icon: string;
  section: "principal" | "clinica" | "caja" | "sistema" | "comercial";
  permissions?: string[];
  requiredGroups?: number[];
  visibleInDrawer?: boolean;
};

export type DrawerMenuSection = {
  id: string;
  title: string;
  items: DrawerMenuItem[];
};

export const drawerMenuSections: DrawerMenuSection[] = [
  {
    id: "principal",
    title: "Principal",
    items: [
      {
        id: "inicio",
        label: "Inicio",
        route: "Inicio",
        icon: "home-outline",
        section: "principal",
        visibleInDrawer: true,
      },
    ],
  },
  {
    id: "clinica",
    title: "Clínica & Médicos",
    items: [
      {
        id: "prestaciones",
        label: "Prestaciones",
        route: "Prestaciones",
        icon: "medical-outline",
        section: "clinica",
        requiredGroups: [
          ROLES.ADMINISTRADORES,
          ROLES.GERENCIA,
          ROLES.PRESTACIONES,
        ],
        visibleInDrawer: true,
      },
      {
        id: "agrupacion-especialidades",
        label: "Agrupación Especialidades",
        route: "AgrupacionEspecialidades",
        icon: "folder-open-outline",
        section: "clinica",
        requiredGroups: [
          ROLES.ADMINISTRADORES,
          ROLES.GERENCIA,
          ROLES.PRESTACIONES,
        ],
        visibleInDrawer: true,
      },
      {
        id: "vinculos-emr",
        label: "Vínculos EMR",
        route: "VinculosEMR",
        icon: "link-outline",
        section: "clinica",
        requiredGroups: [ROLES.ADMINISTRADORES, ROLES.GERENCIA, ROLES.IT],
        visibleInDrawer: true,
      },
      {
        id: "vinculos-tm-informante",
        label: "Vínculos TM-Informante",
        route: "VinculosTMInformante",
        icon: "git-branch-outline",
        section: "clinica",
        requiredGroups: [
          ROLES.ADMINISTRADORES,
          ROLES.GERENCIA,
          ROLES.TM,
          ROLES.TM_VINCULANTE,
        ],
        visibleInDrawer: true,
      },
    ],
  },
  {
    id: "caja",
    title: "Caja",
    items: [
      {
        id: "caja",
        label: "Caja",
        route: "Caja",
        icon: "cash-outline",
        section: "caja",
        requiredGroups: [
          ROLES.CAJA,
          ROLES.ADMINISTRADORES,
          ROLES.GERENCIA,
          ROLES.CONTABILIDAD,
        ],
        visibleInDrawer: true,
      },
    ],
  },
  {
    id: "sistema",
    title: "Sistema & Herramientas",
    items: [
      {
        id: "usuarios-del-sistema",
        label: "Usuarios del Sistema",
        route: "UsuariosDelSistema",
        icon: "people-outline",
        section: "sistema",
        requiredGroups: [
          ROLES.ADMINISTRADORES,
          ROLES.GERENCIA,
          ROLES.ADMIN_V2,
          ROLES.IT,
          ROLES.SECRETARIA,
        ],
        visibleInDrawer: true,
      },
      {
        id: "mantenedor-grupos",
        label: "Mantenedor Grupos",
        route: "MantenedorGrupos",
        icon: "layers-outline",
        section: "sistema",
        requiredGroups: [ROLES.ADMINISTRADORES, ROLES.GERENCIA, ROLES.IT],
        visibleInDrawer: true,
      },
      {
        id: "roles-permisos",
        label: "Roles y Permisos",
        route: "RolesPermisos",
        icon: "shield-checkmark-outline",
        section: "sistema",
        permissions: [PERMISSIONS.VIEW_PERMISSION_MAINTAINER],
        requiredGroups: [ROLES.ADMINISTRADORES, ROLES.GERENCIA, ROLES.IT],
        visibleInDrawer: true,
      },
      {
        id: "auditoria-permisos",
        label: "Auditoría de permisos",
        route: "AuditoriaPermisos",
        icon: "document-text-outline",
        section: "sistema",
        permissions: [PERMISSIONS.AUDIT_GLOBAL],
        visibleInDrawer: true,
      },
      {
        id: "box-pantalla",
        label: "Box Pantalla",
        route: "BoxPantalla",
        icon: "desktop-outline",
        section: "sistema",
        permissions: [PERMISSIONS.MANAGE_SCREENS],
        requiredGroups: [ROLES.ADMINISTRADORES, ROLES.GERENCIA, ROLES.IT],
        visibleInDrawer: true,
      },
      {
        id: "mantenedor-pantallas",
        label: "Mantenedor Pantallas",
        route: "MantenedorPantallas",
        icon: "grid-outline",
        section: "sistema",
        permissions: [PERMISSIONS.MANAGE_SCREENS],
        requiredGroups: [ROLES.ADMINISTRADORES, ROLES.GERENCIA, ROLES.IT],
        visibleInDrawer: true,
      },
      {
        id: "gestion-totem",
        label: "Gestión Totem",
        route: "GestionTotem",
        icon: "tv-outline",
        section: "sistema",
        requiredGroups: [ROLES.ADMINISTRADORES, ROLES.GERENCIA, ROLES.IT],
        visibleInDrawer: true,
      },
      {
        id: "interfaces",
        label: "Interfaces",
        route: "Interfaces",
        icon: "sync-outline",
        section: "sistema",
        permissions: [PERMISSIONS.MANAGE_INTERFACES],
        visibleInDrawer: true,
      },
    ],
  },
  {
    id: "comercial",
    title: "Comercial & Pagos",
    items: [
      {
        id: "financiadores",
        label: "Financiadores",
        route: "Financiadores",
        icon: "card-outline",
        section: "comercial",
        requiredGroups: [
          ROLES.ADMINISTRADORES,
          ROLES.GERENCIA,
          ROLES.CONTABILIDAD,
        ],
        visibleInDrawer: true,
      },
      {
        id: "tipos-pago",
        label: "Tipos de Pago",
        route: "TiposPago",
        icon: "cash-outline",
        section: "comercial",
        requiredGroups: [
          ROLES.ADMINISTRADORES,
          ROLES.GERENCIA,
          ROLES.CONTABILIDAD,
        ],
        visibleInDrawer: true,
      },
      {
        id: "metodos-pago",
        label: "Métodos de Pago",
        route: "MetodosPago",
        icon: "wallet-outline",
        section: "comercial",
        requiredGroups: [
          ROLES.ADMINISTRADORES,
          ROLES.GERENCIA,
          ROLES.CONTABILIDAD,
        ],
        visibleInDrawer: true,
      },
      {
        id: "relacion-pagos",
        label: "Relación de Pagos",
        route: "RelacionPagos",
        icon: "receipt-outline",
        section: "comercial",
        requiredGroups: [
          ROLES.ADMINISTRADORES,
          ROLES.GERENCIA,
          ROLES.CONTABILIDAD,
        ],
        visibleInDrawer: true,
      },
    ],
  },
];

export function getVisibleMenuSections(userGroupId?: number | null) {
  const groupId = Number(userGroupId);
  const isSuperAdmin = ROLE_GROUPS.SUPER_ADMIN.some((id) => id === groupId);

  return drawerMenuSections
    .map((section) => {
      const visibleItems = section.items.filter((item) => {
        if (!userGroupId) {
          return false;
        }

        if (isSuperAdmin) {
          return item.visibleInDrawer !== false;
        }

        const requiredGroups = item.requiredGroups ?? [];

        if (requiredGroups.length === 0) {
          return item.visibleInDrawer !== false;
        }

        return requiredGroups.includes(groupId);
      });

      return {
        ...section,
        items: visibleItems,
      };
    })
    .filter((section) => section.items.length > 0);
}
