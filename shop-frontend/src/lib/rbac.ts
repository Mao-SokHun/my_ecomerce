'use client';

export type StaffRole = 'SUPER_ADMIN' | 'ADMIN' | 'CASHIER' | 'WAREHOUSE';

export interface RolePermissionConfig {
  role: StaffRole;
  titleKm: string;
  titleEn: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  descriptionKm: string;
  allowedNavHrefs: string[];
  canCreateRoles: StaffRole[]; // Roles this staff member is allowed to create/assign
  canViewFinancials: boolean; // Cost price, Gross profit, Net margins
  canEditProducts: boolean;
  canManageUsers: boolean;
  canManageSettings: boolean;
  canManageInventory: boolean;
  canProcessOrders: boolean;
}

export const STAFF_ROLES: Record<StaffRole, RolePermissionConfig> = {
  SUPER_ADMIN: {
    role: 'SUPER_ADMIN',
    titleKm: 'អភិបាលជាន់ខ្ពស់ (Super Admin)',
    titleEn: 'Super Admin',
    badgeBg: 'bg-rose-100 dark:bg-rose-950/60',
    badgeText: 'text-rose-700 dark:text-rose-300',
    badgeBorder: 'border-rose-300/80 dark:border-rose-800',
    descriptionKm: 'សិទ្ធិពេញលេញបង្កើត និងកែប្រែគ្រប់គណនី (Super Admin, Admin, Cashier, Warehouse) និងគ្រប់គ្រងហិរញ្ញវត្ថុ',
    allowedNavHrefs: [
      '/admin',
      '/admin/analytics',
      '/admin/orders',
      '/admin/inventory',
      '/admin/products',
      '/admin/categories',
      '/admin/users',
      '/admin/coupons',
      '/admin/banners',
      '/admin/settings',
      '/admin/audit',
    ],
    canCreateRoles: ['SUPER_ADMIN', 'ADMIN', 'CASHIER', 'WAREHOUSE'],
    canViewFinancials: true,
    canEditProducts: true,
    canManageUsers: true,
    canManageSettings: true,
    canManageInventory: true,
    canProcessOrders: true,
  },
  ADMIN: {
    role: 'ADMIN',
    titleKm: 'អ្នកគ្រប់គ្រង (Admin)',
    titleEn: 'Store Admin',
    badgeBg: 'bg-indigo-100 dark:bg-indigo-950/60',
    badgeText: 'text-indigo-700 dark:text-indigo-300',
    badgeBorder: 'border-indigo-300/80 dark:border-indigo-800',
    descriptionKm: 'គ្រប់គ្រងការលក់ ស្តុក អតិថិជន និងបង្កើតបានតែគណនី Cashier/POS និង Warehouse ប៉ុណ្ណោះ (មិនអាចបង្កើត Super Admin ឬ Admin ឡើយ)',
    allowedNavHrefs: [
      '/admin',
      '/admin/analytics',
      '/admin/orders',
      '/admin/inventory',
      '/admin/products',
      '/admin/categories',
      '/admin/users',
      '/admin/coupons',
      '/admin/banners',
      '/admin/audit',
    ],
    canCreateRoles: ['CASHIER', 'WAREHOUSE'],
    canViewFinancials: true,
    canEditProducts: true,
    canManageUsers: true, // Can access users page to manage Cashier/Warehouse
    canManageSettings: false,
    canManageInventory: true,
    canProcessOrders: true,
  },
  CASHIER: {
    role: 'CASHIER',
    titleKm: 'បុគ្គលិកគិតលុយ (Cashier / POS)',
    titleEn: 'Cashier / POS',
    badgeBg: 'bg-emerald-100 dark:bg-emerald-950/60',
    badgeText: 'text-emerald-700 dark:text-emerald-300',
    badgeBorder: 'border-emerald-300/80 dark:border-emerald-800',
    descriptionKm: 'ទទួលការកម្មង់ ស្កេន Barcode ព្រីនវិក្កយបត្រ (មិនអាចមើលឃើញថ្លៃដើម ឬប្រាក់ចំណេញឡើយ)',
    allowedNavHrefs: [
      '/admin/orders',
      '/admin/products',
    ],
    canCreateRoles: [],
    canViewFinancials: false,
    canEditProducts: false,
    canManageUsers: false,
    canManageSettings: false,
    canManageInventory: false,
    canProcessOrders: true,
  },
  WAREHOUSE: {
    role: 'WAREHOUSE',
    titleKm: 'បុគ្គលិកឃ្លាំងស្តុក (Warehouse)',
    titleEn: 'Warehouse Keeper',
    badgeBg: 'bg-amber-100 dark:bg-amber-950/60',
    badgeText: 'text-amber-800 dark:text-amber-300',
    badgeBorder: 'border-amber-300/80 dark:border-amber-800',
    descriptionKm: 'កត់ត្រានាំចូលស្តុក កាត់ស្តុកខូច រាប់ស្តុក និងព្រីនផ្លាកដឹកជញ្ជូន',
    allowedNavHrefs: [
      '/admin/inventory',
      '/admin/orders',
      '/admin/products',
    ],
    canCreateRoles: [],
    canViewFinancials: false,
    canEditProducts: false,
    canManageUsers: false,
    canManageSettings: false,
    canManageInventory: true,
    canProcessOrders: false,
  },
};

export const SUPER_ADMIN_EMAILS = [
  'shshopbyonline@gmail.com',
  'sokhunmao390@gmail.com',
];

export function isSuperAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  return SUPER_ADMIN_EMAILS.includes(email.trim().toLowerCase());
}

const STORAGE_KEY_ACTIVE_ROLE = 'sh_admin_active_role';
const STORAGE_KEY_USER_STAFF_ROLES = 'sh_user_staff_roles_map';

export function getActiveStaffRole(): StaffRole {
  if (typeof window === 'undefined') return 'SUPER_ADMIN';
  try {
    const saved = localStorage.getItem(STORAGE_KEY_ACTIVE_ROLE) as StaffRole;
    if (saved && STAFF_ROLES[saved]) return saved;
  } catch {}
  return 'SUPER_ADMIN';
}

export function setActiveStaffRole(role: StaffRole): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_ACTIVE_ROLE, role);
    window.dispatchEvent(new Event('staff_role_changed'));
  } catch {}
}

export function getUserStaffRolesMap(): Record<string, StaffRole> {
  if (typeof window === 'undefined') return {};
  try {
    const saved = localStorage.getItem(STORAGE_KEY_USER_STAFF_ROLES);
    if (saved) return JSON.parse(saved);
  } catch {}
  return {};
}

export function getUserStaffRole(userId: string, defaultDbRole?: string, email?: string | null): StaffRole | 'USER' {
  if (isSuperAdminEmail(email)) {
    return 'SUPER_ADMIN';
  }
  if (defaultDbRole !== 'ADMIN') return 'USER';
  const map = getUserStaffRolesMap();
  if (map[userId] && STAFF_ROLES[map[userId]]) {
    return map[userId];
  }
  return 'ADMIN'; // Default fallback for ADMIN role in database
}

export function setUserStaffRole(userId: string, role: StaffRole): void {
  if (typeof window === 'undefined') return;
  try {
    const map = getUserStaffRolesMap();
    map[userId] = role;
    localStorage.setItem(STORAGE_KEY_USER_STAFF_ROLES, JSON.stringify(map));
    window.dispatchEvent(new Event('user_staff_role_updated'));
  } catch {}
}

export function canCreateRole(actorRole: StaffRole, targetRole: StaffRole): boolean {
  const cfg = STAFF_ROLES[actorRole] || STAFF_ROLES.SUPER_ADMIN;
  return cfg.canCreateRoles.includes(targetRole);
}

export function getCreatableRoles(actorRole: StaffRole): StaffRole[] {
  const cfg = STAFF_ROLES[actorRole] || STAFF_ROLES.SUPER_ADMIN;
  return cfg.canCreateRoles;
}

export function canAccessNav(role: StaffRole, href: string): boolean {
  const cfg = STAFF_ROLES[role] || STAFF_ROLES.SUPER_ADMIN;
  if (href === '/admin' && (role === 'CASHIER' || role === 'WAREHOUSE')) {
    return false;
  }
  return cfg.allowedNavHrefs.some((allowed) => href === allowed || href.startsWith(`${allowed}/`));
}

// ==========================================
// AUDIT TRAIL LOGGING
// ==========================================

export interface AuditLogEntry {
  id: string;
  action: string;
  actionCategory: 'PRODUCT' | 'STOCK' | 'ORDER' | 'AUTH' | 'FINANCE' | 'SYSTEM';
  descriptionKm: string;
  descriptionEn: string;
  actorName: string;
  actorRole: StaffRole;
  targetId?: string;
  targetName?: string;
  previousValue?: string;
  newValue?: string;
  ipAddress?: string;
  createdAt: string;
}

const STORAGE_KEY_AUDIT_LOGS = 'sh_system_audit_logs';

const INITIAL_AUDIT_LOGS: AuditLogEntry[] = [
  {
    id: 'audit_1',
    action: 'PRICE_CHANGE',
    actionCategory: 'PRODUCT',
    descriptionKm: 'បានកែប្រែតម្លៃលក់ទំនិញ Sony WH-1000XM5 ($320.00 -> $349.99)',
    descriptionEn: 'Updated product price for Sony WH-1000XM5 ($320.00 -> $349.99)',
    actorName: 'Mao Sokhun (Super Admin)',
    actorRole: 'SUPER_ADMIN',
    targetId: 'pro_sony_1',
    targetName: 'Sony WH-1000XM5',
    previousValue: '$320.00',
    newValue: '$349.99',
    ipAddress: '103.216.50.12 (Phnom Penh)',
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: 'audit_2',
    action: 'DAMAGED_WRITE_OFF',
    actionCategory: 'STOCK',
    descriptionKm: 'បានកាត់ស្តុកខូចខាតចំនួន 3 គ្រឿង ថ្លៃដើមសរុប $720.00',
    descriptionEn: 'Logged 3 units damaged write-off ($720.00 capital loss)',
    actorName: 'Vannak (Warehouse Staff)',
    actorRole: 'WAREHOUSE',
    targetId: 'stock_adj_9',
    targetName: 'Sony Headphones',
    previousValue: 'Stock: 9',
    newValue: 'Stock: 6',
    ipAddress: '103.216.50.15 (Toul Kork)',
    createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
  },
  {
    id: 'audit_3',
    action: 'ORDER_STATUS_UPDATE',
    actionCategory: 'ORDER',
    descriptionKm: 'បានប្តូរស្ថានភាព Order ORD-MTZHRA9T-D89D17 ទៅជា DELIVERED',
    descriptionEn: 'Updated order ORD-MTZHRA9T-D89D17 status to DELIVERED',
    actorName: 'Sreynich (Cashier)',
    actorRole: 'CASHIER',
    targetId: 'ord_123',
    targetName: 'ORD-MTZHRA9T-D89D17',
    previousValue: 'SHIPPED',
    newValue: 'DELIVERED',
    ipAddress: '103.216.50.18 (Phnom Penh)',
    createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
  },
];

export function getAuditLogs(): AuditLogEntry[] {
  if (typeof window === 'undefined') return INITIAL_AUDIT_LOGS;
  try {
    const saved = localStorage.getItem(STORAGE_KEY_AUDIT_LOGS);
    if (saved) return JSON.parse(saved);
  } catch {}
  return INITIAL_AUDIT_LOGS;
}

export function logAuditEvent(entry: Omit<AuditLogEntry, 'id' | 'createdAt'>): AuditLogEntry {
  const list = getAuditLogs();
  const created: AuditLogEntry = {
    ...entry,
    id: `audit_${Date.now()}`,
    createdAt: new Date().toISOString(),
  };
  const next = [created, ...list];
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY_AUDIT_LOGS, JSON.stringify(next.slice(0, 300))); // Keep last 300
      window.dispatchEvent(new Event('audit_logs_updated'));
    } catch {}
  }
  return created;
}
