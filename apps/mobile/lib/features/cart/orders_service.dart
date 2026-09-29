import 'package:supabase_flutter/supabase_flutter.dart';
import 'cart_item.dart';

class OrderResult {
  const OrderResult({required this.requestId});
  final String requestId;
}

// Mirrors CartScreen.tsx's create_order RPC call — one atomic call, with
// price/currency/name re-derived server-side from menu_items rather than
// trusted from the cart (supabase/migrations/00000000000014_orders.sql).
class OrdersService {
  OrdersService(this._client);

  final SupabaseClient _client;

  Future<OrderResult> createOrder({
    required String paymentMethod, // 'charge_to_room' | 'pay_at_hotel'
    String? note,
    required List<CartItem> items,
  }) async {
    final row = await _client.rpc('create_order', params: {
      'p_payment_method': paymentMethod,
      'p_note': note,
      'p_items': items.map((i) => {'menu_item_id': i.menuItemId, 'quantity': i.quantity}).toList(),
    }).single();
    return OrderResult(requestId: row['request_id'] as String);
  }
}
