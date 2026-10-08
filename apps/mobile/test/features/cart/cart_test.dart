import 'package:flutter_test/flutter_test.dart';
import 'package:room_aura_mobile/features/cart/cart.dart';
import 'package:room_aura_mobile/features/cart/cart_item.dart';

CartItem _item(String id, {int priceMinor = 1000, int quantity = 1}) {
  return CartItem(menuItemId: id, name: 'Item $id', priceMinor: priceMinor, currency: 'USD', quantity: quantity);
}

void main() {
  test('starts empty with room charge allowed', () {
    final cart = Cart();
    expect(cart.items, isEmpty);
    expect(cart.itemCount, 0);
    expect(cart.totalMinor, 0);
    expect(cart.allowsRoomCharge, isTrue);
  });

  test('addItem adds a new line, and merges quantity when added again', () {
    final cart = Cart();
    cart.addItem(_item('a', priceMinor: 500));
    cart.addItem(_item('a', priceMinor: 500), quantity: 2);

    expect(cart.items, hasLength(1));
    expect(cart.items.single.quantity, 3);
    expect(cart.itemCount, 3);
    expect(cart.totalMinor, 1500);
  });

  test('setQuantity updates an existing line', () {
    final cart = Cart();
    cart.addItem(_item('a', priceMinor: 500));
    cart.setQuantity('a', 5);
    expect(cart.items.single.quantity, 5);
    expect(cart.totalMinor, 2500);
  });

  test('setQuantity of zero or less removes the line', () {
    final cart = Cart();
    cart.addItem(_item('a'));
    cart.setQuantity('a', 0);
    expect(cart.items, isEmpty);
  });

  test('setQuantity on a menuItemId not in the cart is a no-op', () {
    final cart = Cart();
    cart.addItem(_item('a'));
    cart.setQuantity('missing', 5);
    expect(cart.items, hasLength(1));
  });

  test('totalMinor sums price * quantity across multiple distinct items', () {
    final cart = Cart();
    cart.addItem(_item('a', priceMinor: 500), quantity: 2);
    cart.addItem(_item('b', priceMinor: 1200));
    expect(cart.totalMinor, 500 * 2 + 1200);
    expect(cart.itemCount, 3);
  });

  test('setAllowsRoomCharge toggles and notifies only on an actual change', () {
    final cart = Cart();
    var notifications = 0;
    cart.addListener(() => notifications++);

    cart.setAllowsRoomCharge(false);
    expect(cart.allowsRoomCharge, isFalse);
    expect(notifications, 1);

    cart.setAllowsRoomCharge(false);
    expect(notifications, 1, reason: 'setting the same value again should not notify');
  });

  test('clear empties the cart and resets allowsRoomCharge to true', () {
    final cart = Cart();
    cart.addItem(_item('a'));
    cart.setAllowsRoomCharge(false);

    cart.clear();

    expect(cart.items, isEmpty);
    expect(cart.allowsRoomCharge, isTrue);
  });
}
