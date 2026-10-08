import 'package:flutter/foundation.dart';
import 'cart_item.dart';

// Mirrors apps/tourist/src/cart/CartContext.tsx — plain in-memory state,
// deliberately not persisted (lost on app restart, same as the web app).
class Cart extends ChangeNotifier {
  final List<CartItem> _items = [];
  // Property of whichever shop these items came from (create_order requires
  // a cart to be single-shop already) — false hides "Charge to room" in the
  // cart, since an external shop has no hotel folio to post to.
  bool _allowsRoomCharge = true;

  List<CartItem> get items => List.unmodifiable(_items);

  int get itemCount => _items.fold(0, (sum, i) => sum + i.quantity);

  int get totalMinor => _items.fold(0, (sum, i) => sum + i.priceMinor * i.quantity);

  bool get allowsRoomCharge => _allowsRoomCharge;

  void setAllowsRoomCharge(bool value) {
    if (_allowsRoomCharge == value) return;
    _allowsRoomCharge = value;
    notifyListeners();
  }

  void addItem(CartItem item, {int quantity = 1}) {
    final index = _items.indexWhere((i) => i.menuItemId == item.menuItemId);
    if (index == -1) {
      _items.add(item.copyWith(quantity: quantity));
    } else {
      _items[index] = _items[index].copyWith(quantity: _items[index].quantity + quantity);
    }
    notifyListeners();
  }

  void setQuantity(String menuItemId, int quantity) {
    final index = _items.indexWhere((i) => i.menuItemId == menuItemId);
    if (index == -1) return;
    if (quantity <= 0) {
      _items.removeAt(index);
    } else {
      _items[index] = _items[index].copyWith(quantity: quantity);
    }
    notifyListeners();
  }

  void clear() {
    _items.clear();
    _allowsRoomCharge = true;
    notifyListeners();
  }
}
