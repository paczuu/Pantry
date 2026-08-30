import {
  User,
  Household,
  PantryItem,
  ProductCatalogItem,
  ShoppingList,
  ShoppingItem,
  Note,
  Recipe,
  ActivityLog,
  CategorySetting,
  PantryStats,
  AuditStats,
  UserRole,
} from '../types';

const API_BASE = '/api';

export type BarcodeProviderKey =
  | 'OPEN_FOOD_FACTS'
  | 'OPEN_BEAUTY_FACTS'
  | 'OPEN_PRODUCTS_FACTS'
  | 'OPEN_PET_FOOD_FACTS';

export interface BarcodeSourceConfig {
  id?: string;
  provider: BarcodeProviderKey;
  countryCode: string;
  enabled: boolean;
  priority: number;
}

class ApiService {
  private getToken(): string | null {
    return localStorage.getItem('spizarnia_token');
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem('spizarnia_token');
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
      }
      throw new Error(data.error || data.message || `Błąd serwera (${response.status})`);
    }

    return data as T;
  }

  // === Auth & Household ===
  async login(email: string, password: string): Promise<{ token: string; user: User }> {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async register(
    email: string,
    password: string,
    name: string,
    householdName?: string,
    inviteCode?: string
  ): Promise<{ token: string; user: User }> {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name, householdName, inviteCode }),
    });
  }

  async getMe(): Promise<{ user: User }> {
    return this.request('/auth/me');
  }

  async joinHousehold(inviteCode: string): Promise<{ user: User; message: string }> {
    return this.request('/auth/join-household', {
      method: 'POST',
      body: JSON.stringify({ inviteCode }),
    });
  }

  async getHouseholdMembers(): Promise<{ members: User[] }> {
    return this.request('/auth/household/members');
  }

  async updateMemberRole(memberId: string, role: UserRole): Promise<{ member: User; message: string }> {
    return this.request(`/auth/household/members/${memberId}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role }),
    });
  }

  async removeMember(memberId: string): Promise<{ message: string }> {
    return this.request(`/auth/household/members/${memberId}`, {
      method: 'DELETE',
    });
  }

  // === Catalog & Barcode ===
  async lookupBarcode(barcode: string): Promise<{
    found: boolean;
    product?: ProductCatalogItem;
    inPantryItems: PantryItem[];
    totalInPantry: number;
    barcode: string;
  }> {
    return this.request(`/catalog/barcode/${encodeURIComponent(barcode)}`);
  }

  async searchCatalog(query: string): Promise<{ products: ProductCatalogItem[] }> {
    return this.request(`/catalog/search?q=${encodeURIComponent(query)}`);
  }

  async saveCustomProduct(product: Partial<ProductCatalogItem>): Promise<{ product: ProductCatalogItem }> {
    return this.request('/catalog', {
      method: 'POST',
      body: JSON.stringify(product),
    });
  }

  // === Pantry ===
  async getPantryItems(params?: {
    category?: string;
    status?: string;
    search?: string;
    filterByExpiry?: string;
    sortBy?: string;
  }): Promise<{ items: PantryItem[] }> {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, val]) => {
        if (val) query.append(key, val);
      });
    }
    const qStr = query.toString();
    return this.request(`/pantry${qStr ? `?${qStr}` : ''}`);
  }

  async getPantryStats(): Promise<PantryStats> {
    return this.request('/pantry/stats');
  }

  async addPantryItem(item: Partial<PantryItem>): Promise<{ item: PantryItem; message: string }> {
    return this.request('/pantry', {
      method: 'POST',
      body: JSON.stringify(item),
    });
  }

  async updatePantryItem(id: string, item: Partial<PantryItem>): Promise<{ item: PantryItem; message: string }> {
    return this.request(`/pantry/${id}`, {
      method: 'PUT',
      body: JSON.stringify(item),
    });
  }

  async consumePantryItem(
    id: string,
    amount: number = 1,
    isWasted: boolean = false
  ): Promise<{ item: PantryItem; consumedAmount: number; remainingAmount: number; message: string }> {
    return this.request(`/pantry/${id}/consume`, {
      method: 'POST',
      body: JSON.stringify({ amount, isWasted }),
    });
  }

  async barcodeQuickRemove(data: {
    barcode?: string;
    itemId?: string;
    amount: number;
    isWasted?: boolean;
  }): Promise<{ success: boolean; message: string; remaining?: number }> {
    return this.request('/pantry/barcode-quick-remove', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deletePantryItem(id: string): Promise<{ message: string }> {
    return this.request(`/pantry/${id}`, {
      method: 'DELETE',
    });
  }

  // === Shopping Lists ===
  async getShoppingLists(): Promise<{ lists: ShoppingList[] }> {
    return this.request('/shopping-lists');
  }

  async createShoppingList(data: { name: string; icon?: string; color?: string }): Promise<{ list: ShoppingList }> {
    return this.request('/shopping-lists', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateShoppingList(id: string, data: Partial<ShoppingList>): Promise<{ list: ShoppingList }> {
    return this.request(`/shopping-lists/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteShoppingList(id: string): Promise<{ message: string }> {
    return this.request(`/shopping-lists/${id}`, {
      method: 'DELETE',
    });
  }

  async addShoppingItem(listId: string, item: Partial<ShoppingItem>): Promise<{ item: ShoppingItem }> {
    return this.request(`/shopping-lists/${listId}/items`, {
      method: 'POST',
      body: JSON.stringify(item),
    });
  }

  async updateShoppingItem(itemId: string, item: Partial<ShoppingItem>): Promise<{ item: ShoppingItem }> {
    return this.request(`/shopping-lists/items/${itemId}`, {
      method: 'PUT',
      body: JSON.stringify(item),
    });
  }

  async deleteShoppingItem(itemId: string): Promise<{ message: string }> {
    return this.request(`/shopping-lists/items/${itemId}`, {
      method: 'DELETE',
    });
  }

  async clearCheckedItems(listId: string): Promise<{ message: string }> {
    return this.request(`/shopping-lists/${listId}/clear-checked`, {
      method: 'POST',
    });
  }

  async transferCheckedToPantry(listId: string): Promise<{ message: string; addedCount: number }> {
    return this.request(`/shopping-lists/${listId}/transfer-to-pantry`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
  }

  async addExpiringToShoppingList(listId: string): Promise<{ message: string; addedCount: number }> {
    return this.request(`/shopping-lists/${listId}/add-expiring-from-pantry`, {
      method: 'POST',
    });
  }

  // === Notes ===
  async getNotes(): Promise<{ notes: Note[] }> {
    return this.request('/notes');
  }

  async createNote(note: Partial<Note>): Promise<{ note: Note }> {
    return this.request('/notes', {
      method: 'POST',
      body: JSON.stringify(note),
    });
  }

  async updateNote(id: string, note: Partial<Note>): Promise<{ message: string }> {
    return this.request(`/notes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(note),
    });
  }

  async deleteNote(id: string): Promise<{ message: string }> {
    return this.request(`/notes/${id}`, {
      method: 'DELETE',
    });
  }

  // === Recipes ===
  async getRecipes(): Promise<{ recipes: Recipe[] }> {
    return this.request('/recipes');
  }

  async createRecipe(recipe: {
    name: string;
    instructions?: string;
    ingredients?: string[];
    notes?: string | null;
    imageUrl?: string | null;
    rating?: number;
  }): Promise<{ recipe: Recipe }> {
    return this.request('/recipes', {
      method: 'POST',
      body: JSON.stringify(recipe),
    });
  }

  async updateRecipe(
    id: string,
    recipe: Partial<{
      name: string;
      instructions: string;
      ingredients: string[];
      notes: string | null;
      imageUrl: string | null;
      rating: number;
    }>
  ): Promise<{ message: string }> {
    return this.request(`/recipes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(recipe),
    });
  }

  async deleteRecipe(id: string): Promise<{ message: string }> {
    return this.request(`/recipes/${id}`, {
      method: 'DELETE',
    });
  }

  // === Audit Logs (Admin Only) ===
  async getAuditLogs(params?: {
    page?: number;
    limit?: number;
    userId?: string;
    action?: string;
    entityType?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<{ total: number; page: number; totalPages: number; logs: ActivityLog[] }> {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== '') query.append(key, String(val));
      });
    }
    const qStr = query.toString();
    return this.request(`/audit-logs${qStr ? `?${qStr}` : ''}`);
  }

  async getAuditStats(): Promise<AuditStats> {
    return this.request('/audit-logs/stats');
  }

  // === Settings ===
  async getCategories(): Promise<{ categories: CategorySetting[] }> {
    return this.request('/settings/categories');
  }

  async addCategory(name: string, icon?: string, color?: string): Promise<{ category: CategorySetting }> {
    return this.request('/settings/categories', {
      method: 'POST',
      body: JSON.stringify({ name, icon, color }),
    });
  }

  async deleteCategory(id: string): Promise<{ message: string }> {
    return this.request(`/settings/categories/${id}`, {
      method: 'DELETE',
    });
  }

  async updateHouseholdSettings(data: {
    expiryWarningDays?: number;
    name?: string;
  }): Promise<{ settings: { expiryWarningDays: number; name: string }; message: string }> {
    return this.request('/settings/household', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async getBarcodeSources(): Promise<{
    sources: BarcodeSourceConfig[];
    usingDefaults: boolean;
  }> {
    return this.request('/settings/barcode-sources');
  }

  async updateBarcodeSources(
    sources: BarcodeSourceConfig[]
  ): Promise<{ sources: BarcodeSourceConfig[]; message: string }> {
    return this.request('/settings/barcode-sources', {
      method: 'PUT',
      body: JSON.stringify({ sources }),
    });
  }

  async resetBarcodeSources(): Promise<{
    sources: BarcodeSourceConfig[];
    usingDefaults: boolean;
    message: string;
  }> {
    return this.request('/settings/barcode-sources', {
      method: 'DELETE',
    });
  }
}

export const api = new ApiService();
