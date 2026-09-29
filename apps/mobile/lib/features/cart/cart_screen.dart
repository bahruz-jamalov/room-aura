import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../shared/money.dart';
import '../../theme/tokens.dart';
import '../requests/request_detail_screen.dart';
import 'cart.dart';
import 'orders_service.dart';

class CartScreen extends StatefulWidget {
  const CartScreen({super.key});

  @override
  State<CartScreen> createState() => _CartScreenState();
}

class _CartScreenState extends State<CartScreen> {
  late final _ordersService = OrdersService(Supabase.instance.client);
  String _paymentMethod = 'charge_to_room';
  final _noteController = TextEditingController();
  bool _submitting = false;
  String? _errorMessage;

  @override
  void dispose() {
    _noteController.dispose();
    super.dispose();
  }

  Future<void> _placeOrder(Cart cart) async {
    setState(() {
      _submitting = true;
      _errorMessage = null;
    });
    try {
      final result = await _ordersService.createOrder(
        paymentMethod: _paymentMethod,
        note: _noteController.text.trim().isEmpty ? null : _noteController.text.trim(),
        items: cart.items,
      );
      cart.clear();
      if (!mounted) return;
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(builder: (_) => RequestDetailScreen(requestId: result.requestId)),
      );
    } catch (e) {
      setState(() => _errorMessage = 'Could not place your order. Please try again.');
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final cart = context.watch<Cart>();
    if (cart.items.isEmpty) {
      return Scaffold(
        appBar: AppBar(title: const Text('Cart')),
        body: const Center(child: Text('—', style: TextStyle(color: RaColors.textSecondary))),
      );
    }
    final currency = cart.items.first.currency;
    return Scaffold(
      appBar: AppBar(title: const Text('Cart')),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(RaSpace.pageGutter),
          children: [
            for (final item in cart.items)
              Padding(
                padding: const EdgeInsets.only(bottom: RaSpace.s3),
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(item.name, style: const TextStyle(fontWeight: FontWeight.w600)),
                          Text(
                            '${formatMoney(item.priceMinor, item.currency)} × ${item.quantity}',
                            style: const TextStyle(fontSize: RaText.sm, color: RaColors.textSecondary),
                          ),
                        ],
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.remove_circle_outline),
                      onPressed: () => cart.setQuantity(item.menuItemId, item.quantity - 1),
                    ),
                    Text('${item.quantity}'),
                    IconButton(
                      icon: const Icon(Icons.add_circle_outline),
                      onPressed: () => cart.setQuantity(item.menuItemId, item.quantity + 1),
                    ),
                  ],
                ),
              ),
            const Divider(color: RaColors.border, height: RaSpace.s6),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Total', style: TextStyle(fontWeight: FontWeight.w700)),
                Text(formatMoney(cart.totalMinor, currency), style: const TextStyle(fontWeight: FontWeight.w700)),
              ],
            ),
            const SizedBox(height: RaSpace.s4),
            TextField(
              controller: _noteController,
              decoration: const InputDecoration(labelText: 'Note (optional)'),
            ),
            const SizedBox(height: RaSpace.s4),
            const Text('Payment method', style: TextStyle(fontWeight: FontWeight.w600)),
            RadioGroup<String>(
              groupValue: _paymentMethod,
              onChanged: (v) => setState(() => _paymentMethod = v!),
              child: const Column(
                children: [
                  RadioListTile<String>(value: 'charge_to_room', title: Text('Charge to room'), contentPadding: EdgeInsets.zero),
                  RadioListTile<String>(value: 'pay_at_hotel', title: Text('Pay at hotel'), contentPadding: EdgeInsets.zero),
                ],
              ),
            ),
            if (_errorMessage != null) ...[
              const SizedBox(height: RaSpace.s3),
              Text(_errorMessage!, style: const TextStyle(color: RaColors.danger)),
            ],
            const SizedBox(height: RaSpace.s6),
            ElevatedButton(
              onPressed: _submitting ? null : () => _placeOrder(cart),
              child: _submitting
                  ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2))
                  : const Text('Place order'),
            ),
          ],
        ),
      ),
    );
  }
}
