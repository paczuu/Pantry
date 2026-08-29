export type UserRole = 'ADMIN' | 'MEMBER';

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string | null;
  role: UserRole;
  householdId?: string | null;
  household?: Household | null;
  createdAt?: string;
}

export interface Household {
  id: string;
  name: string;
  inviteCode: string;
  createdAt: string;
  updatedAt?: string;
  members?: User[];
  customCategories?: CategorySetting[];
}

export interface CategorySetting {
  id: string;
  householdId: string;
  name: string;
  icon: string;
  color: string;
  order: number;
}

export type PantryItemStatus = 'ACTIVE' | 'CONSUMED' | 'WASTED';

export interface PantryItem {
  id: string;
  householdId: string;
  barcode?: string | null;
  name: string;
  brand?: string | null;
  category: string;
  quantity: number; // wyłącznie sztuki
  capacity?: string | null; // np. "500g", "1L", "250ml"
  expiryDate?: string | null;
  openedDate?: string | null;
  notes?: string | null;
  imageUrl?: string | null;
  status: PantryItemStatus;
  addedById?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface ProductCatalogItem {
  id?: string;
  barcode: string;
  name: string;
  brand?: string;
  category?: string;
  capacity?: string;
  imageUrl?: string;
  nutriScore?: string;
  source: 'LOCAL' | 'OFF' | 'CUSTOM';
}

export interface ShoppingItem {
  id: string;
  shoppingListId: string;
  name: string;
  quantity: number; // sztuki
  capacity?: string | null;
  category: string;
  barcode?: string | null;
  isChecked: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface ShoppingList {
  id: string;
  householdId: string;
  name: string;
  icon: string;
  color: string;
  isArchived: boolean;
  items: ShoppingItem[];
  createdAt: string;
  updatedAt?: string;
}

export type NoteColor = 'default' | 'emerald' | 'blue' | 'amber' | 'rose' | 'purple';

export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface Note {
  id: string;
  householdId: string;
  title: string;
  content: string;
  isChecklist: boolean;
  checklistData?: string | null; // JSON string of ChecklistItem[]
  color: NoteColor;
  isPinned: boolean;
  category: string;
  createdById?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface ActivityLog {
  id: string;
  householdId: string;
  userId?: string | null;
  userName: string;
  userEmail: string;
  action: string;
  entityType: string;
  entityName: string;
  details: string;
  createdAt: string;
  user?: {
    id: string;
    name: string;
    email: string;
    avatar?: string | null;
    role: UserRole;
  } | null;
}

export interface PantryStats {
  totalActive: number;
  expiredCount: number;
  expiring3DaysCount: number;
  expiring7DaysCount: number;
  openedCount: number;
  categoryCounts: Record<string, number>;
}

export interface AuditStats {
  totalEvents30Days: number;
  actionCounts: Record<string, number>;
  userActivity: Record<string, { count: number; name: string }>;
}

export interface NavItemConfig {
  id: string;
  label: string;
  visible: boolean;
  order: number;
}
