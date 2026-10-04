import { Router, text } from 'express';
import { authenticateToken } from './middleware/auth.js';
import { requireAdmin } from './middleware/requireAdmin.js';
import { requireSystemAdmin } from './middleware/requireSystemAdmin.js';
import * as authController from './controllers/authController.js';
import * as catalogController from './controllers/catalogController.js';
import * as pantryController from './controllers/pantryController.js';
import * as shoppingController from './controllers/shoppingController.js';
import * as notesController from './controllers/notesController.js';
import * as recipesController from './controllers/recipesController.js';
import * as auditController from './controllers/auditController.js';
import * as settingsController from './controllers/settingsController.js';
import * as barcodeSettingsController from './controllers/barcodeSettingsController.js';
import * as systemAdminController from './controllers/systemAdminController.js';

const router = Router();

// === Auth & Household ===
router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);
router.get('/auth/me', authenticateToken, authController.getMe);
router.delete('/auth/account', authenticateToken, authController.deleteOwnAccount);
router.post('/auth/join-household', authenticateToken, authController.joinHousehold);
router.get('/auth/household/members', authenticateToken, authController.getHouseholdMembers);
router.post(
  '/auth/household/invite-code',
  authenticateToken,
  requireAdmin,
  authController.generateHouseholdInviteCode
);
router.put(
  '/auth/household/members/:memberId/role',
  authenticateToken,
  requireAdmin,
  authController.updateMemberRole
);
router.delete(
  '/auth/household/members/:memberId',
  authenticateToken,
  requireAdmin,
  authController.removeMember
);


// === System Admin ===
router.get(
  '/system/users',
  authenticateToken,
  requireSystemAdmin,
  systemAdminController.getSystemUsers
);
router.put(
  '/system/users/:userId',
  authenticateToken,
  requireSystemAdmin,
  systemAdminController.updateSystemUser
);
router.delete(
  '/system/users/:userId',
  authenticateToken,
  requireSystemAdmin,
  systemAdminController.deleteSystemUser
);
router.get(
  '/system/households',
  authenticateToken,
  requireSystemAdmin,
  systemAdminController.getSystemHouseholds
);
router.post(
  '/system/households',
  authenticateToken,
  requireSystemAdmin,
  systemAdminController.createSystemHousehold
);
router.post(
  '/system/households/:householdId/invite-code',
  authenticateToken,
  requireSystemAdmin,
  systemAdminController.generateSystemHouseholdInviteCode
);

// === Catalog & Barcode ===
router.get(
  '/catalog/barcode/:barcode',
  authenticateToken,
  catalogController.getProductByBarcode
);
router.get('/catalog/search', authenticateToken, catalogController.searchCatalog);
router.post('/catalog', authenticateToken, catalogController.saveCustomProduct);

// === Pantry / Magazyn ===
router.get('/pantry', authenticateToken, pantryController.getPantryItems);
router.get('/pantry/stats', authenticateToken, pantryController.getPantryStats);
router.get('/pantry/:id', authenticateToken, pantryController.getPantryItemById);
router.post('/pantry', authenticateToken, pantryController.addPantryItem);
router.put('/pantry/:id', authenticateToken, pantryController.updatePantryItem);
router.post('/pantry/:id/consume', authenticateToken, pantryController.consumePantryItem);
router.post(
  '/pantry/barcode-quick-remove',
  authenticateToken,
  pantryController.barcodeQuickRemove
);
router.delete('/pantry/:id', authenticateToken, pantryController.deletePantryItem);

// === Shopping Lists / Listy Zakupów ===
router.get('/shopping-lists', authenticateToken, shoppingController.getShoppingLists);
router.get(
  '/shopping-lists/:id',
  authenticateToken,
  shoppingController.getShoppingListById
);
router.post('/shopping-lists', authenticateToken, shoppingController.createShoppingList);
router.put(
  '/shopping-lists/:id',
  authenticateToken,
  shoppingController.updateShoppingList
);
router.delete(
  '/shopping-lists/:id',
  authenticateToken,
  shoppingController.deleteShoppingList
);
router.post(
  '/shopping-lists/:id/items',
  authenticateToken,
  shoppingController.addShoppingItem
);
router.put(
  '/shopping-lists/items/:itemId',
  authenticateToken,
  shoppingController.updateShoppingItem
);
router.delete(
  '/shopping-lists/items/:itemId',
  authenticateToken,
  shoppingController.deleteShoppingItem
);
router.post(
  '/shopping-lists/:id/clear-checked',
  authenticateToken,
  shoppingController.clearCheckedShoppingItems
);
router.post(
  '/shopping-lists/:id/transfer-to-pantry',
  authenticateToken,
  shoppingController.transferCheckedToPantry
);
router.post(
  '/shopping-lists/:id/add-expiring-from-pantry',
  authenticateToken,
  shoppingController.addExpiringToShoppingList
);

// === Notes / Notatki ===
router.get('/notes', authenticateToken, notesController.getNotes);
router.post('/notes', authenticateToken, notesController.createNote);
router.put('/notes/:id', authenticateToken, notesController.updateNote);
router.delete('/notes/:id', authenticateToken, notesController.deleteNote);

// === Recipes / Przepisy ===
router.get('/recipes', authenticateToken, recipesController.getRecipes);
router.post('/recipes', authenticateToken, recipesController.createRecipe);
router.put('/recipes/:id', authenticateToken, recipesController.updateRecipe);
router.delete('/recipes/:id', authenticateToken, recipesController.deleteRecipe);

// === Audit Log (Admin Only) ===
router.get(
  '/audit-logs',
  authenticateToken,
  requireAdmin,
  auditController.getAuditLogs
);
router.get(
  '/audit-logs/stats',
  authenticateToken,
  requireAdmin,
  auditController.getAuditStats
);

// === Settings / Konfiguracja ===
router.get('/settings/household', authenticateToken, settingsController.getHouseholdSettings);
router.put('/settings/household', authenticateToken, settingsController.updateHouseholdSettings);
router.get('/settings/categories', authenticateToken, settingsController.getCategories);
router.post('/settings/categories', authenticateToken, settingsController.addCategory);
router.delete(
  '/settings/categories/:id',
  authenticateToken,
  settingsController.deleteCategory
);
router.get('/settings/backup', authenticateToken, settingsController.exportHouseholdBackup);
router.post(
  '/settings/backup/restore',
  authenticateToken,
  requireAdmin,
  text({ type: 'application/x-pantry-backup', limit: '20mb' }),
  settingsController.restoreHouseholdBackup
);

// === Settings / Źródła EAN ===
router.get(
  '/settings/barcode-sources',
  authenticateToken,
  barcodeSettingsController.getBarcodeSources
);
router.put(
  '/settings/barcode-sources',
  authenticateToken,
  requireAdmin,
  barcodeSettingsController.updateBarcodeSources
);
router.delete(
  '/settings/barcode-sources',
  authenticateToken,
  requireAdmin,
  barcodeSettingsController.resetBarcodeSources
);

export default router;
