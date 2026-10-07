import 'package:supabase_flutter/supabase_flutter.dart';
import '../../shared/resolve_translation.dart';
import 'catalogue_models.dart';

// Mirrors apps/tourist/src/hooks/{useServiceCategories,useServicesByCategory,
// useMenuCategories,useMenuItems}.ts — same two-query (rows + translations)
// pattern, RLS-scoped to the guest's own hotel via guest_hotel_id().
class CatalogueService {
  CatalogueService(this._client);

  final SupabaseClient _client;

  Future<List<ServiceCategory>> fetchCategories({
    required String locale,
    required String fallbackLocale,
  }) async {
    final rows = await _client
        .from('service_categories')
        .select('id, category_type, icon, image_url, sort_order')
        .eq('is_active', true)
        .order('sort_order', ascending: true);
    final ids = rows.map((r) => r['id'] as String).toList();
    if (ids.isEmpty) return [];

    final translations = await _client
        .from('service_category_translations')
        .select('category_id, locale, name, description')
        .inFilter('category_id', ids);

    return rows.map((row) {
      final id = row['id'] as String;
      final matches = translations.where((t) => t['category_id'] == id).toList();
      final resolved = resolveTranslation(matches, (t) => t['locale'] as String, locale, fallbackLocale);
      return ServiceCategory(
        id: id,
        categoryType: row['category_type'] as String,
        icon: row['icon'] as String?,
        imageUrl: row['image_url'] as String?,
        name: resolved?['name'] as String? ?? 'Untitled',
        description: resolved?['description'] as String?,
      );
    }).toList();
  }

  Future<List<ServiceItem>> fetchServicesByCategory(
    String categoryId, {
    required String locale,
    required String fallbackLocale,
  }) async {
    final rows = await _client
        .from('services')
        .select(
          'id, department_id, image_url, is_free, price_minor, currency, expected_minutes, allows_quantity, max_quantity, allows_note, requires_scheduling, sort_order',
        )
        .eq('category_id', categoryId)
        .eq('is_active', true)
        .order('sort_order', ascending: true);
    final ids = rows.map((r) => r['id'] as String).toList();
    if (ids.isEmpty) return [];

    final translations = await _client
        .from('service_translations')
        .select('service_id, locale, name, description')
        .inFilter('service_id', ids);

    return rows.map((row) {
      final id = row['id'] as String;
      final matches = translations.where((t) => t['service_id'] == id).toList();
      final resolved = resolveTranslation(matches, (t) => t['locale'] as String, locale, fallbackLocale);
      return ServiceItem(
        id: id,
        departmentId: row['department_id'] as String,
        imageUrl: row['image_url'] as String?,
        isFree: row['is_free'] as bool,
        priceMinor: row['price_minor'] as int,
        currency: row['currency'] as String,
        expectedMinutes: row['expected_minutes'] as int?,
        allowsQuantity: row['allows_quantity'] as bool,
        maxQuantity: row['max_quantity'] as int,
        allowsNote: row['allows_note'] as bool,
        requiresScheduling: row['requires_scheduling'] as bool,
        name: resolved?['name'] as String? ?? 'Untitled',
        description: resolved?['description'] as String?,
      );
    }).toList();
  }

  Future<List<MenuCategory>> fetchMenuCategories({
    required String locale,
    required String fallbackLocale,
  }) async {
    final rows = await _client
        .from('menu_categories')
        .select('id, sort_order')
        .eq('is_active', true)
        .order('sort_order', ascending: true);
    final ids = rows.map((r) => r['id'] as String).toList();
    if (ids.isEmpty) return [];

    final translations = await _client
        .from('menu_category_translations')
        .select('menu_category_id, locale, name')
        .inFilter('menu_category_id', ids);

    return rows.map((row) {
      final id = row['id'] as String;
      final matches = translations.where((t) => t['menu_category_id'] == id).toList();
      final resolved = resolveTranslation(matches, (t) => t['locale'] as String, locale, fallbackLocale);
      return MenuCategory(id: id, name: resolved?['name'] as String? ?? 'Untitled');
    }).toList();
  }

  Future<List<MenuItem>> fetchMenuItems(
    String menuCategoryId, {
    required String locale,
    required String fallbackLocale,
  }) async {
    final rows = await _client
        .from('menu_items')
        .select('id, image_url, price_minor, currency, prep_minutes, status, sort_order')
        .eq('menu_category_id', menuCategoryId)
        .neq('status', 'hidden')
        .order('sort_order', ascending: true);
    final ids = rows.map((r) => r['id'] as String).toList();
    if (ids.isEmpty) return [];

    final translations = await _client
        .from('menu_item_translations')
        .select('menu_item_id, locale, name, description')
        .inFilter('menu_item_id', ids);

    return rows.map((row) {
      final id = row['id'] as String;
      final matches = translations.where((t) => t['menu_item_id'] == id).toList();
      final resolved = resolveTranslation(matches, (t) => t['locale'] as String, locale, fallbackLocale);
      return MenuItem(
        id: id,
        imageUrl: row['image_url'] as String?,
        priceMinor: row['price_minor'] as int,
        currency: row['currency'] as String,
        prepMinutes: row['prep_minutes'] as int?,
        status: row['status'] as String,
        name: resolved?['name'] as String? ?? 'Untitled',
        description: resolved?['description'] as String?,
      );
    }).toList();
  }
}
