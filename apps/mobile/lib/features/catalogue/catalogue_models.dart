class ServiceCategory {
  const ServiceCategory({
    required this.id,
    required this.categoryType,
    required this.icon,
    required this.imageUrl,
    required this.name,
    required this.description,
  });

  final String id;
  final String categoryType; // 'standard' | 'menu'
  final String? icon;
  final String? imageUrl;
  final String name;
  final String? description;

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
    required this.name,
    required this.description,
  });

  final String id;
  final String departmentId;
  final String? imageUrl;
  final bool isFree;
  final int priceMinor;
  final String currency;
  final int? expectedMinutes;
  final bool allowsQuantity;
  final int maxQuantity;
  final bool allowsNote;
  final String name;
  final String? description;
}

class MenuCategory {
  const MenuCategory({required this.id, required this.name});

  final String id;
  final String name;
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
