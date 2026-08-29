import { Router } from 'express';
import { authenticateToken } from './middleware/auth.js';
import { requireAdmin } from './middleware/requireAdmin.js';
import * as authController from './controllers/authController.js';
import * as catalogController from './controllers/catalogController.js';
import * as pantryController from './controllers/pantryController.js';
import * as shoppingController from './controllers/shoppingController.js';
import * as notesController from './controllers/notesController.js';
import * as auditController from './controllers/auditController.js';
import * as settingsController from './controllers/settingsController.js';
import * as barcodeSettingsController from './controllers/barcodeSettingsController.js';

const router = Router();

// === Auth & Household ===
router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);
router.get('/auth/me', authenticateToken, authController.getMe);
router.post('/auth/join-household', authenticateToken, authController.joinHousehold);
router.get('/auth/household/members', authenticateToken, authController.getHouseholdMembers);
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
router.get('/settings/categories', authenticateToken, settingsController.getCategories);
router.post('/settings/categories', authenticateToken, settingsController.addCategory);
router.delete(
  '/settings/categories/:id',
  authenticateToken,
  settingsController.deleteCategory
);
router.get('/settings/backup', authenticateToken, settingsController.exportHouseholdBackup);

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
