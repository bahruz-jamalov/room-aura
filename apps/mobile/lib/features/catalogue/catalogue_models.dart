class ServiceCategory {
  const ServiceCategory({
    required this.id,
    required this.categoryType,
    required this.icon,
    required this.imageUrl,
    required this.name,
    required this.description,
    required this.hasChildren,
  });

  final String id;
  final String categoryType; // 'standard' | 'menu'
  final String? icon;
  final String? imageUrl;
  final String name;
  final String? description;
  // True for a group tile (e.g. "Explore the City"): opening it shows its
  // child categories instead of services/a menu — see
  // 00000000000027_multi_shop_menus.sql.
  final bool hasChildren;

  bool get isMenu => categoryType == 'menu';
}

class ServiceItem {
  const ServiceItem({
    required this.id,
    required this.departmentId,
    required this.imageUrl,
    required this.isFree,
    required this.priceMinor,
    required this.currency,
    required this.expectedMinutes,
    required this.allowsQuantity,
    required this.maxQuantity,
    required this.allowsNote,
    required this.requiresScheduling,
    required this.name,
    required this.description,
  });

  final String id;
  // Null for a global "Explore the City" service — there's no single
  // hotel's department to route it to; the requesting guest's own hotel's
  // hotel_settings.city_services_department_id is used instead. See
  // 00000000000029_global_catalog.sql.
  final String? departmentId;
  final String? imageUrl;
  final bool isFree;
  final int priceMinor;
  final String currency;
  final int? expectedMinutes;
  final bool allowsQuantity;
  final int maxQuantity;
  final bool allowsNote;
  final bool requiresScheduling;
  final String name;
  final String? description;
}

class MenuCategory {
  const MenuCategory({required this.id, required this.name, required this.allowsRoomCharge});

  final String id;
  final String name;
  // Property of the shop this category belongs to, not the category itself
  // — false for an external "Explore the City" shop, which has no hotel
  // folio to post a room charge to. See 00000000000028_shop_room_charge.sql.
  final bool allowsRoomCharge;
}

class MenuItem {
  const MenuItem({
    required this.id,
    required this.imageUrl,
    required this.priceMinor,
    required this.currency,
    required this.prepMinutes,
    required this.status,
    required this.name,
    required this.description,
  });

  final String id;
  final String? imageUrl;
  final int priceMinor;
  final String currency;
  final int? prepMinutes;
  final String status; // 'available' | 'sold_out' | 'hidden' (hidden pre-filtered)
  final String name;
  final String? description;

  bool get isSoldOut => status == 'sold_out';
}
