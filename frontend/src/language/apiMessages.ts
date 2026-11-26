/**
 * Translations of the messages sent by the backend. The backend responds with a stable `code`
 * (and optional `params`); the text shown to the user is looked up here in the active language.
 * Keep the codes in sync with `backend/src/utils/messages.ts`.
 */
import { Language } from './translations';
import { getInitialLanguage } from './LanguageContext';

export type ApiParams = Record<string, string | number>;

export const API_MESSAGES = {
  AUTH_EMAIL_TAKEN: { en: 'A user with that email address already exists.', pl: 'Użytkownik z tym adresem e-mail już istnieje.' },
  AUTH_REGISTERED: { en: 'Account created successfully.', pl: 'Konto zostało utworzone.' },
  AUTH_FIRST_ADMIN_CREATED: { en: 'First system administrator account created.', pl: 'Utworzono konto pierwszego administratora systemu.' },
  AUTH_LOGGED_IN: { en: 'Logged in successfully.', pl: 'Zalogowano pomyślnie.' },
  AUTH_LOGIN_FAILED: { en: 'An error occurred during login.', pl: 'Wystąpił błąd podczas logowania.' },
  AUTH_REGISTER_FAILED: { en: 'An error occurred during registration.', pl: 'Wystąpił błąd podczas rejestracji.' },
  AUTH_INVALID_CREDENTIALS: { en: 'Invalid email or password.', pl: 'Nieprawidłowy e-mail lub hasło.' },
  AUTH_CREDENTIALS_REQUIRED: { en: 'Please provide email and password.', pl: 'Podaj e-mail i hasło.' },
  PASSWORD_CHANGED: { en: 'Password changed.', pl: 'Hasło zostało zmienione.' },
  PASSWORD_CURRENT_WRONG: { en: 'The current password is incorrect.', pl: 'Obecne hasło jest nieprawidłowe.' },
  PASSWORD_SAME_AS_CURRENT: { en: 'The new password must be different from the current one.', pl: 'Nowe hasło musi się różnić od obecnego.' },
  PASSWORD_FIELDS_REQUIRED: { en: 'Please provide the current and the new password.', pl: 'Podaj obecne i nowe hasło.' },
  PASSWORD_CHANGE_FAILED: { en: 'Failed to change the password.', pl: 'Nie udało się zmienić hasła.' },
  AUTH_TOKEN_MISSING: { en: 'Authorization token missing. Please log in.', pl: 'Brak tokenu autoryzacji. Zaloguj się.' },
  AUTH_TOKEN_INVALID: { en: 'Invalid or expired session token.', pl: 'Nieprawidłowy lub wygasły token sesji.' },
  UNAUTHORIZED: { en: 'Unauthorized.', pl: 'Brak autoryzacji.' },
  ADMIN_REQUIRED: { en: 'Administrator privileges required. Access restricted to ADMIN role.', pl: 'Wymagane uprawnienia administratora. Dostęp tylko dla roli ADMIN.' },
  SYSADMIN_REQUIRED: { en: 'This operation requires system administrator privileges.', pl: 'Ta operacja wymaga uprawnień administratora systemu.' },
  PRIVILEGE_CHECK_FAILED: { en: 'Failed to verify privileges.', pl: 'Nie udało się zweryfikować uprawnień.' },
  VALIDATION_EMAIL: { en: 'Invalid email address', pl: 'Nieprawidłowy adres e-mail' },
  VALIDATION_PASSWORD: { en: 'Password must be at least 6 characters', pl: 'Hasło musi mieć co najmniej 6 znaków' },
  VALIDATION_NAME: { en: 'Name must be at least 2 characters', pl: 'Imię musi mieć co najmniej 2 znaki' },
  PROFILE_FETCH_FAILED: { en: 'Error fetching profile data.', pl: 'Błąd pobierania danych profilu.' },
  INVITE_REQUIRED: { en: 'Invite code is required.', pl: 'Kod zaproszenia jest wymagany.' },
  INVITE_PROVIDE: { en: 'Please provide an invite code.', pl: 'Podaj kod zaproszenia.' },
  INVITE_LENGTH: { en: 'Invite code must be 6 characters.', pl: 'Kod zaproszenia musi mieć 6 znaków.' },
  INVITE_INVALID: { en: 'Invalid household invite code.', pl: 'Nieprawidłowy kod zaproszenia do gospodarstwa.' },
  INVITE_HOUSEHOLD_NOT_FOUND: { en: 'No household found with that code.', pl: 'Nie znaleziono gospodarstwa z tym kodem.' },
  INVITE_EXPIRED: { en: 'The invite code has expired. Please ask the administrator to generate a new code.', pl: 'Kod zaproszenia wygasł. Poproś administratora o wygenerowanie nowego kodu.' },
  INVITE_GENERATED: { en: 'New invite code generated. The code is valid for 5 minutes.', pl: 'Wygenerowano nowy kod zaproszenia. Kod jest ważny 5 minut.' },
  INVITE_GENERATED_FOR: { en: 'Invite code generated for household "{name}".', pl: 'Wygenerowano kod zaproszenia dla gospodarstwa „{name}”.' },
  INVITE_GENERATE_FAILED: { en: 'Failed to generate invite code.', pl: 'Nie udało się wygenerować kodu zaproszenia.' },
  HOUSEHOLD_JOINED: { en: 'Joined the household.', pl: 'Dołączono do gospodarstwa.' },
  HOUSEHOLD_JOIN_FAILED: { en: 'Error joining household.', pl: 'Błąd dołączania do gospodarstwa.' },
  HOUSEHOLD_NOT_ASSIGNED: { en: 'No household assigned.', pl: 'Nie przypisano gospodarstwa.' },
  HOUSEHOLD_NOT_FOUND: { en: 'Household not found.', pl: 'Nie znaleziono gospodarstwa.' },
  HOUSEHOLD_SELECTED_MISSING: { en: 'The selected household does not exist.', pl: 'Wybrane gospodarstwo nie istnieje.' },
  HOUSEHOLD_CREATED: { en: 'Household created and invite code generated (valid for 5 minutes).', pl: 'Utworzono gospodarstwo i wygenerowano kod zaproszenia (ważny 5 minut).' },
  HOUSEHOLD_CREATE_FAILED: { en: 'Failed to create household.', pl: 'Nie udało się utworzyć gospodarstwa.' },
  HOUSEHOLDS_FETCH_FAILED: { en: 'Failed to fetch households.', pl: 'Nie udało się pobrać gospodarstw.' },
  HOUSEHOLD_NAME_EMPTY: { en: 'Household name cannot be empty.', pl: 'Nazwa gospodarstwa nie może być pusta.' },
  HOUSEHOLD_NAME_TOO_SHORT: { en: 'Household name must be at least 2 characters.', pl: 'Nazwa gospodarstwa musi mieć co najmniej 2 znaki.' },
  HOUSEHOLD_NAME_TOO_LONG: { en: 'Household name cannot exceed 60 characters.', pl: 'Nazwa gospodarstwa nie może przekraczać 60 znaków.' },
  HOUSEHOLD_NAME_ADMIN_ONLY: { en: 'Only an administrator can change the household name.', pl: 'Tylko administrator może zmienić nazwę gospodarstwa.' },
  MEMBERS_FETCH_FAILED: { en: 'Error fetching members.', pl: 'Błąd pobierania członków gospodarstwa.' },
  MEMBER_NOT_FOUND: { en: 'Member not found in this household.', pl: 'Nie znaleziono członka w tym gospodarstwie.' },
  MEMBER_ROLE_UPDATED: { en: 'Role updated successfully.', pl: 'Rola została zaktualizowana.' },
  MEMBER_ROLE_UPDATE_FAILED: { en: 'Error updating role.', pl: 'Błąd aktualizacji roli.' },
  MEMBER_DELETED: { en: 'User account has been deleted.', pl: 'Konto użytkownika zostało usunięte.' },
  MEMBER_DELETE_FAILED: { en: 'Error deleting user account.', pl: 'Błąd usuwania konta użytkownika.' },
  MEMBER_SELF_REMOVE: { en: 'You cannot remove yourself from the household.', pl: 'Nie możesz usunąć siebie z gospodarstwa.' },
  ROLE_INVALID: { en: 'Invalid role. Available: ADMIN, MEMBER.', pl: 'Nieprawidłowa rola. Dostępne: ADMIN, MEMBER.' },
  ADMIN_SELF_DEMOTE: { en: 'You cannot remove your own administrator role — you are the only administrator.', pl: 'Nie możesz odebrać sobie roli administratora — jesteś jedynym administratorem.' },
  ACCOUNT_DELETED: { en: 'Your account has been deleted.', pl: 'Twoje konto zostało usunięte.' },
  ACCOUNT_DELETE_FAILED: { en: 'Failed to delete account.', pl: 'Nie udało się usunąć konta.' },
  ACCOUNT_DELETE_HAS_HOUSEHOLD: { en: 'The account can only be deleted from this screen if you do not belong to any household.', pl: 'Konto można usunąć z tego ekranu tylko wtedy, gdy nie należysz do żadnego gospodarstwa.' },
  ACCOUNT_PRIMARY_PROTECTED: { en: 'The primary account cannot be deleted.', pl: 'Konta głównego nie można usunąć.' },
  USER_NOT_FOUND: { en: 'User not found.', pl: 'Nie znaleziono użytkownika.' },
  USER_NOT_EXIST: { en: 'User does not exist.', pl: 'Użytkownik nie istnieje.' },
  USER_NO_HOUSEHOLD: { en: 'User does not belong to a household.', pl: 'Użytkownik nie należy do żadnego gospodarstwa.' },
  USER_NOT_IN_HOUSEHOLD: { en: 'User does not belong to this household.', pl: 'Użytkownik nie należy do tego gospodarstwa.' },
  USER_ROLE_INVALID: { en: 'Invalid user role.', pl: 'Nieprawidłowa rola użytkownika.' },
  USER_UPDATED: { en: 'User updated.', pl: 'Użytkownik został zaktualizowany.' },
  USER_UPDATE_FAILED: { en: 'Failed to update user.', pl: 'Nie udało się zaktualizować użytkownika.' },
  USER_DELETED_NAMED: { en: 'Account for {name} ({email}) has been deleted.', pl: 'Konto użytkownika {name} ({email}) zostało usunięte.' },
  USER_DELETE_FAILED: { en: 'Failed to delete user.', pl: 'Nie udało się usunąć użytkownika.' },
  USERS_FETCH_FAILED: { en: 'Failed to fetch users.', pl: 'Nie udało się pobrać użytkowników.' },
  SYSADMIN_CANNOT_REVOKE_PRIMARY: { en: 'Cannot revoke system admin privileges from the primary account.', pl: 'Nie można odebrać uprawnień administratora systemu kontu głównemu.' },
  SYSADMIN_SELF_REVOKE: { en: 'You cannot revoke your own system admin privileges.', pl: 'Nie możesz odebrać sobie uprawnień administratora systemu.' },
  SYSADMIN_SELF_DELETE: { en: 'You cannot delete your own system admin account.', pl: 'Nie możesz usunąć własnego konta administratora systemu.' },
  SYSADMIN_LAST_PROTECTED: { en: 'You cannot delete the only system administrator account.', pl: 'Nie możesz usunąć jedynego konta administratora systemu.' },
  PANTRY_FETCH_FAILED: { en: 'Error fetching products.', pl: 'Błąd pobierania produktów.' },
  PANTRY_ITEM_FETCH_FAILED: { en: 'Error fetching product.', pl: 'Błąd pobierania produktu.' },
  PANTRY_ADDED: { en: 'Product added to the pantry.', pl: 'Dodano produkt do spiżarni.' },
  PANTRY_ADD_FAILED: { en: 'Error adding the product.', pl: 'Błąd dodawania produktu.' },
  PANTRY_UPDATED: { en: 'Product updated.', pl: 'Produkt został zaktualizowany.' },
  PANTRY_UPDATE_FAILED: { en: 'Error updating the product.', pl: 'Błąd aktualizacji produktu.' },
  PANTRY_QTY_INCREASED: { en: 'Increased the quantity of "{name}" by {qty} pcs. (total: {total} pcs.)', pl: 'Zwiększono ilość produktu „{name}” o {qty} szt. (łącznie: {total} szt.)' },
  PANTRY_CONSUMED_ALL: { en: 'Product completely consumed.', pl: 'Produkt został całkowicie zużyty.' },
  PANTRY_QTY_DECREASED: { en: 'Decreased the quantity by {qty} pcs.', pl: 'Zmniejszono ilość o {qty} szt.' },
  PANTRY_REMOVED_QTY: { en: 'Removed {qty} pcs. ({name}).', pl: 'Usunięto {qty} szt. ({name}).' },
  PANTRY_REMOVED_BY_BARCODE: { en: 'Removed {qty} pcs. of product "{name}".', pl: 'Usunięto {qty} szt. produktu „{name}”.' },
  PANTRY_DELETED: { en: 'Product removed from the pantry.', pl: 'Produkt został usunięty ze spiżarni.' },
  PRODUCT_NAME_REQUIRED: { en: 'Product name is required.', pl: 'Nazwa produktu jest wymagana.' },
  PRODUCT_NOT_FOUND: { en: 'Product not found.', pl: 'Nie znaleziono produktu.' },
  BARCODE_REQUIRED: { en: 'Provide a barcode.', pl: 'Podaj kod kreskowy.' },
  BARCODE_LOOKUP_FAILED: { en: 'Failed to look up barcode.', pl: 'Nie udało się wyszukać kodu kreskowego.' },
  CATALOG_SEARCH_FAILED: { en: 'Error searching the catalog.', pl: 'Błąd przeszukiwania katalogu.' },
  CATALOG_SAVE_FAILED: { en: 'Error saving the custom product.', pl: 'Błąd zapisu własnego produktu.' },
  CATALOG_NO_BARCODE_SKIPPED: { en: 'Product without a barcode does not require entry in the EAN catalog.', pl: 'Produkt bez kodu kreskowego nie wymaga wpisu w katalogu EAN.' },
  PANTRY_CONSUME_FAILED: { en: 'Error consuming the product.', pl: 'Błąd zużywania produktu.' },
  PANTRY_BARCODE_OR_ID_REQUIRED: { en: 'Required barcode or product identifier.', pl: 'Wymagany kod kreskowy lub identyfikator produktu.' },
  PANTRY_NOT_IN_PANTRY: { en: 'Product not found in the pantry.', pl: 'Nie znaleziono produktu w spiżarni.' },
  PANTRY_NO_ACTIVE_BY_BARCODE: { en: 'No active products found with this barcode in the pantry.', pl: 'Nie znaleziono aktywnych produktów z tym kodem kreskowym w spiżarni.' },
  PANTRY_QUICK_REMOVE_FAILED: { en: 'Error quick removing the product by barcode.', pl: 'Błąd szybkiego usuwania produktu kodem kreskowym.' },
  PANTRY_DELETE_FAILED: { en: 'Error deleting the product.', pl: 'Błąd usuwania produktu.' },
  STATS_FAILED: { en: 'Error calculating statistics.', pl: 'Błąd obliczania statystyk.' },
  SHOPPING_LISTS_FETCH_FAILED: { en: 'Error getting the shopping lists.', pl: 'Błąd pobierania list zakupów.' },
  SHOPPING_LIST_FETCH_FAILED: { en: 'Error getting the shopping list.', pl: 'Błąd pobierania listy zakupów.' },
  SHOPPING_LIST_NOT_FOUND: { en: 'Shopping list not found.', pl: 'Nie znaleziono listy zakupów.' },
  SHOPPING_LIST_NAME_REQUIRED: { en: 'Shopping list name is required.', pl: 'Nazwa listy zakupów jest wymagana.' },
  SHOPPING_LIST_CREATED: { en: 'Shopping list created.', pl: 'Utworzono listę zakupów.' },
  SHOPPING_LIST_CREATE_FAILED: { en: 'Error creating the shopping list.', pl: 'Błąd tworzenia listy zakupów.' },
  SHOPPING_LIST_UPDATED: { en: 'Shopping list updated.', pl: 'Zaktualizowano listę zakupów.' },
  SHOPPING_LIST_UPDATE_FAILED: { en: 'Error updating the shopping list.', pl: 'Błąd aktualizacji listy zakupów.' },
  SHOPPING_LIST_DELETED: { en: 'Shopping list deleted.', pl: 'Usunięto listę zakupów.' },
  SHOPPING_LIST_DELETE_FAILED: { en: 'Error deleting the shopping list.', pl: 'Błąd usuwania listy zakupów.' },
  SHOPPING_ITEM_ADDED: { en: 'Added to the shopping list.', pl: 'Dodano do listy zakupów.' },
  SHOPPING_ITEM_ADD_FAILED: { en: 'Error adding to the shopping list.', pl: 'Błąd dodawania do listy zakupów.' },
  SHOPPING_ITEM_UPDATE_FAILED: { en: 'Error updating the shopping item.', pl: 'Błąd aktualizacji pozycji listy zakupów.' },
  SHOPPING_ITEM_DELETED: { en: 'Shopping item deleted.', pl: 'Usunięto pozycję z listy zakupów.' },
  SHOPPING_ITEM_DELETE_FAILED: { en: 'Error deleting the shopping item.', pl: 'Błąd usuwania pozycji z listy zakupów.' },
  SHOPPING_CHECKED_CLEARED: { en: 'Checked shopping items cleared from the list.', pl: 'Usunięto kupione pozycje z listy.' },
  SHOPPING_CLEAR_FAILED: { en: 'Error clearing the checked shopping items.', pl: 'Błąd czyszczenia kupionych pozycji.' },
  SHOPPING_NOTHING_TO_TRANSFER: { en: 'No checked items to transfer.', pl: 'Brak zaznaczonych pozycji do przeniesienia.' },
  SHOPPING_TRANSFERRED: { en: 'Successfully transferred {count} items to the pantry!', pl: 'Przeniesiono {count} pozycji do spiżarni!' },
  SHOPPING_TRANSFER_FAILED: { en: 'Error transferring to the pantry.', pl: 'Błąd przenoszenia do spiżarni.' },
  SHOPPING_EXPIRING_ADDED: { en: 'Added {count} products with a short expiry date to the shopping list.', pl: 'Dodano {count} produktów o krótkim terminie ważności do listy zakupów.' },
  SHOPPING_ADD_EXPIRING_FAILED: { en: 'Error adding products with a short expiry date to the shopping list.', pl: 'Błąd dodawania produktów o krótkim terminie ważności do listy zakupów.' },
  NOTES_FETCH_FAILED: { en: 'Error fetching notes.', pl: 'Błąd pobierania notatek.' },
  NOTE_TITLE_REQUIRED: { en: 'Note title is required.', pl: 'Tytuł notatki jest wymagany.' },
  NOTE_CREATED: { en: 'Note created.', pl: 'Notatka została utworzona.' },
  NOTE_CREATE_FAILED: { en: 'Error creating note.', pl: 'Błąd tworzenia notatki.' },
  NOTE_UPDATED: { en: 'Note updated.', pl: 'Notatka została zaktualizowana.' },
  NOTE_UPDATE_FAILED: { en: 'Error updating note.', pl: 'Błąd aktualizacji notatki.' },
  NOTE_DELETED: { en: 'Note deleted.', pl: 'Notatka została usunięta.' },
  NOTE_DELETE_FAILED: { en: 'Error deleting note.', pl: 'Błąd usuwania notatki.' },
  RECIPES_FETCH_FAILED: { en: 'Error fetching recipes.', pl: 'Błąd pobierania przepisów.' },
  RECIPE_NOT_FOUND: { en: 'Recipe not found.', pl: 'Nie znaleziono przepisu.' },
  RECIPE_NAME_REQUIRED: { en: 'Recipe name is required.', pl: 'Nazwa przepisu jest wymagana.' },
  RECIPE_IMAGE_TOO_LARGE: { en: 'Recipe image is too large.', pl: 'Zdjęcie przepisu jest zbyt duże.' },
  RECIPE_IMAGE_INVALID: { en: 'Invalid recipe image format.', pl: 'Nieprawidłowy format zdjęcia przepisu.' },
  RECIPE_RATING_INVALID: { en: 'Recipe rating must be a number from 1 to 10.', pl: 'Ocena przepisu musi być liczbą od 1 do 10.' },
  RECIPE_SAVED: { en: 'Recipe saved.', pl: 'Przepis został zapisany.' },
  RECIPE_CREATE_FAILED: { en: 'Error creating recipe.', pl: 'Błąd tworzenia przepisu.' },
  RECIPE_UPDATED: { en: 'Recipe updated.', pl: 'Przepis został zaktualizowany.' },
  RECIPE_UPDATE_FAILED: { en: 'Error updating recipe.', pl: 'Błąd aktualizacji przepisu.' },
  RECIPE_DELETED: { en: 'Recipe deleted.', pl: 'Przepis został usunięty.' },
  RECIPE_DELETE_FAILED: { en: 'Error deleting recipe.', pl: 'Błąd usuwania przepisu.' },
  SETTINGS_FETCH_FAILED: { en: 'Failed to fetch household settings.', pl: 'Nie udało się pobrać ustawień gospodarstwa.' },
  SETTINGS_SAVED: { en: 'Household settings saved.', pl: 'Zapisano ustawienia gospodarstwa.' },
  SETTINGS_SAVE_FAILED: { en: 'Failed to save household settings.', pl: 'Nie udało się zapisać ustawień gospodarstwa.' },
  CATEGORIES_FETCH_FAILED: { en: 'Failed to fetch categories.', pl: 'Nie udało się pobrać kategorii.' },
  CATEGORY_NAME_REQUIRED: { en: 'Category name is required.', pl: 'Nazwa kategorii jest wymagana.' },
  CATEGORY_CREATE_FAILED: { en: 'Failed to create category or a category with that name already exists.', pl: 'Nie udało się utworzyć kategorii lub kategoria o tej nazwie już istnieje.' },
  CATEGORY_DELETED: { en: 'Category deleted.', pl: 'Kategoria została usunięta.' },
  CATEGORY_DELETE_FAILED: { en: 'Failed to delete category.', pl: 'Nie udało się usunąć kategorii.' },
  EAN_SOURCES_FETCH_FAILED: { en: 'Failed to fetch EAN sources.', pl: 'Nie udało się pobrać źródeł EAN.' },
  EAN_SOURCES_NOT_ARRAY: { en: 'The "sources" field must be an array.', pl: 'Pole „sources” musi być tablicą.' },
  EAN_SOURCES_INVALID: { en: 'One or more EAN sources have an invalid configuration.', pl: 'Co najmniej jedno źródło EAN ma nieprawidłową konfigurację.' },
  EAN_SOURCE_DUPLICATE: { en: 'Source {key} appears more than once.', pl: 'Źródło {key} występuje więcej niż raz.' },
  EAN_SOURCES_SAVED: { en: 'EAN source configuration saved.', pl: 'Zapisano konfigurację źródeł EAN.' },
  EAN_SOURCES_SAVE_FAILED: { en: 'Failed to save EAN sources.', pl: 'Nie udało się zapisać źródeł EAN.' },
  EAN_SOURCES_RESTORED: { en: 'Default EAN sources restored.', pl: 'Przywrócono domyślne źródła EAN.' },
  EAN_SOURCES_RESTORE_FAILED: { en: 'Failed to restore default EAN sources.', pl: 'Nie udało się przywrócić domyślnych źródeł EAN.' },
  BACKUP_GENERATE_FAILED: { en: 'Failed to generate backup.', pl: 'Nie udało się wygenerować kopii zapasowej.' },
  BACKUP_INVALID_JSON: { en: 'The selected file does not contain valid JSON.', pl: 'Wybrany plik nie zawiera poprawnego JSON.' },
  BACKUP_INVALID_FORMAT: { en: 'Invalid backup format.', pl: 'Nieprawidłowy format kopii zapasowej.' },
  BACKUP_TOO_MANY_RECORDS: { en: 'Backup contains too many records.', pl: 'Kopia zapasowa zawiera zbyt wiele rekordów.' },
  BACKUP_RESTORED: { en: 'Backup restored successfully.', pl: 'Kopia zapasowa została przywrócona.' },
  BACKUP_RESTORE_FAILED: { en: 'Failed to restore backup. No data was changed.', pl: 'Nie udało się przywrócić kopii zapasowej. Dane nie zostały zmienione.' },
  BACKUP_INVALID_FIELD: { en: 'Invalid field "{key}" in backup.', pl: 'Nieprawidłowe pole „{key}” w kopii zapasowej.' },
  BACKUP_INVALID_FIELD_DATA: { en: 'Invalid data in field "{key}" of backup.', pl: 'Nieprawidłowe dane w polu „{key}” kopii zapasowej.' },
  BACKUP_MISSING_NAME: { en: 'Missing name in section "{section}" of backup.', pl: 'Brak nazwy w sekcji „{section}” kopii zapasowej.' },
  BACKUP_DUPLICATE_CATEGORY: { en: 'Backup contains a duplicate category "{name}".', pl: 'Kopia zapasowa zawiera zduplikowaną kategorię „{name}”.' },
  BACKUP_INVALID_ITEMS: { en: 'Invalid item list in backup.', pl: 'Nieprawidłowa lista pozycji w kopii zapasowej.' },
  BACKUP_TOO_MANY_ITEMS: { en: 'Backup contains too many shopping list items.', pl: 'Kopia zapasowa zawiera zbyt wiele pozycji list zakupów.' },
  BACKUP_INVALID_ITEM: { en: 'Invalid shopping list item.', pl: 'Nieprawidłowa pozycja listy zakupów.' },
  BACKUP_MISSING_NOTE_TITLE: { en: 'Missing note title in backup.', pl: 'Brak tytułu notatki w kopii zapasowej.' },
  AUDIT_FETCH_FAILED: { en: 'Failed to fetch audit log.', pl: 'Nie udało się pobrać dziennika zdarzeń.' },
  AUDIT_STATS_FAILED: { en: 'Failed to fetch audit statistics.', pl: 'Nie udało się pobrać statystyk dziennika.' },
  AUDIT_FIRST_ADMIN: { en: 'Created the first installation account as household administrator and system administrator.', pl: 'Utworzono pierwsze konto instalacji jako administrator gospodarstwa i administrator systemu.' },
  AUDIT_REGISTERED_INVITE: { en: 'User created an account using an invite code and joined the household.', pl: 'Użytkownik utworzył konto za pomocą kodu zaproszenia i dołączył do gospodarstwa.' },
  AUDIT_MEMBER_JOINED: { en: '{name} joined the household.', pl: '{name} dołączył(a) do gospodarstwa domowego.' },
  AUDIT_INVITE_GENERATED: { en: 'Administrator generated a new invite code valid for 5 minutes.', pl: 'Administrator wygenerował nowy kod zaproszenia ważny przez 5 minut.' },
  AUDIT_ROLE_CHANGED: { en: 'Administrator {admin} changed the role of user {user} ({email}) to: {role}.', pl: 'Administrator {admin} zmienił rolę użytkownika {user} ({email}) na: {role}.' },
  AUDIT_USER_DELETED: { en: 'Administrator {admin} deleted the account of user {user} ({email}) from the system.', pl: 'Administrator {admin} usunął konto użytkownika {user} ({email}) z systemu.' },
  AUDIT_SHOPPING_TRANSFERRED: { en: 'Transferred {count} purchased items directly to the pantry.', pl: 'Przeniesiono {count} kupionych produktów bezpośrednio do spiżarni.' },
  AUDIT_PANTRY_QTY_INCREASED: { en: 'Increased the quantity of an existing product "{name}"{capacity} by {qty} pcs. (currently in the pantry: {total} pcs.).', pl: 'Zwiększono ilość istniejącego produktu „{name}”{capacity} o {qty} szt. (aktualnie w spiżarni: {total} szt.).' },
  AUDIT_PANTRY_ADDED: { en: 'Added {qty} pcs.{capacity}', pl: 'Dodano {qty} szt.{capacity}' },
  AUDIT_PANTRY_ADDED_EXPIRY: { en: 'Added {qty} pcs.{capacity} (expiry: {expiry})', pl: 'Dodano {qty} szt.{capacity} (termin ważności: {expiry})' },
  AUDIT_PANTRY_UPDATED: { en: 'Updated {changes}.', pl: 'Zaktualizowano: {changes}.' },
  AUDIT_PANTRY_CONSUMED_ALL: { en: 'Consumed the entire product "{name}" ({qty} pcs.).', pl: 'Całkowicie zużyto produkt „{name}” ({qty} szt.).' },
  AUDIT_PANTRY_WASTED_ALL: { en: 'Discarded the entire product "{name}" ({qty} pcs.).', pl: 'Wyrzucono cały produkt „{name}” ({qty} szt.).' },
  AUDIT_PANTRY_CONSUMED_PART: { en: 'Consumed {qty} pcs. Remaining {remaining} pcs.', pl: 'Zużyto {qty} szt. Pozostało {remaining} szt.' },
  AUDIT_PANTRY_QUICK_REMOVE: { en: 'Quick removal by barcode scanner: consumed {qty} pcs. Remaining {remaining} pcs.', pl: 'Szybkie usunięcie skanerem: zużyto {qty} szt. Pozostało {remaining} szt.' },
  AUDIT_PANTRY_QUICK_SCAN: { en: 'Quick scanning by barcode scanner: consumed {qty} pcs. Remaining {remaining} pcs.', pl: 'Szybkie skanowanie: zużyto {qty} szt. Pozostało {remaining} szt.' },
  AUDIT_PANTRY_DELETED: { en: 'Completely removed the product "{name}" ({qty} pcs.) from the pantry.', pl: 'Całkowicie usunięto produkt „{name}” ({qty} szt.) ze spiżarni.' },
} as const;

export type ApiMessageCode = keyof typeof API_MESSAGES;

/** Labels of the pantry item fields listed in "updated" audit entries. */
export const AUDIT_FIELD_LABELS: Record<string, { en: string; pl: string }> = {
  name: { en: 'name', pl: 'nazwa' },
  quantity: { en: 'quantity', pl: 'ilość' },
  capacity: { en: 'capacity', pl: 'pojemność' },
  category: { en: 'category', pl: 'kategoria' },
  expiryDate: { en: 'expiry date', pl: 'data ważności' },
  openedDate: { en: 'opening date', pl: 'data otwarcia' },
  status: { en: 'status', pl: 'status' },
};

/** Text used for an empty value in audit entries. */
const NONE_LABEL = { en: 'none', pl: 'brak' } as const;

export const isApiMessageCode = (code: unknown): code is ApiMessageCode =>
  typeof code === 'string' && code in API_MESSAGES;

/**
 * Returns the message for `code` in `language`, filling `{param}` placeholders.
 * Unknown codes fall back to `fallback` (the English text sent by the backend).
 */
export const translateApiMessage = (
  code: unknown,
  params?: ApiParams,
  fallback = '',
  language: Language = getInitialLanguage()
): string => {
  if (!isApiMessageCode(code)) return fallback;
  return API_MESSAGES[code][language].replace(/\{(\w+)\}/g, (_, key: string) => String(params?.[key] ?? ''));
};

/** One changed field of a pantry item, as stored in "updated" audit entries. */
export interface AuditChange {
  field: string;
  from: string | number | null;
  to: string | number | null;
}

/** Renders audit changes as "label: from → to" in the given language. */
export const describeAuditChanges = (changes: AuditChange[], language: Language): string => {
  const value = (v: AuditChange['from']) => (v === null || v === '' ? NONE_LABEL[language] : String(v));
  return changes
    .map((c) => `${AUDIT_FIELD_LABELS[c.field]?.[language] ?? c.field}: ${value(c.from)} → ${value(c.to)}`)
    .join(', ');
};
