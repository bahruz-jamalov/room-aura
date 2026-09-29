class CartItem {
  const CartItem({
    required this.menuItemId,
    required this.name,
    required this.priceMinor,
    required this.currency,
    required this.quantity,
  });

  final String menuItemId;
  final String name;
  final int priceMinor;
  final String currency;
  final int quantity;

  CartItem copyWith({int? quantity}) => CartItem(
        menuItemId: menuItemId,
        name: name,
        priceMinor: priceMinor,
        currency: currency,
        quantity: quantity ?? this.quantity,
      );
}
