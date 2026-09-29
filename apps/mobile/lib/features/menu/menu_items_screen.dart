import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../shared/money.dart';
import '../../theme/tokens.dart';
import '../cart/cart.dart';
import '../cart/cart_item.dart';
import '../cart/cart_screen.dart';
import '../catalogue/catalogue_models.dart';
import '../catalogue/catalogue_service.dart';

class MenuItemsScreen extends StatefulWidget {
  const MenuItemsScreen({super.key, required this.category});

  final MenuCategory category;

  @override
  State<MenuItemsScreen> createState() => _MenuItemsScreenState();
}

class _MenuItemsScreenState extends State<MenuItemsScreen> {
  late final _catalogueService = CatalogueService(Supabase.instance.client);
  late final Future<List<MenuItem>> _itemsFuture =
      _catalogueService.fetchMenuItems(widget.category.id, locale: 'en', fallbackLocale: 'en');

  @override
  Widget build(BuildContext context) {
    final cart = context.watch<Cart>();
    return Scaffold(
      appBar: AppBar(title: Text(widget.category.name)),
      body: SafeArea(
        child: FutureBuilder<List<MenuItem>>(
          future: _itemsFuture,
          builder: (context, snapshot) {
            if (!snapshot.hasData) return const Center(child: CircularProgressIndicator());
            final items = snapshot.data!;
            return ListView.separated(
              padding: const EdgeInsets.fromLTRB(
                RaSpace.pageGutter,
                RaSpace.pageGutter,
                RaSpace.pageGutter,
                RaSpace.s16,
              ),
              itemCount: items.length,
              separatorBuilder: (_, _) => const SizedBox(height: RaSpace.s3),
              itemBuilder: (context, index) => _MenuItemCard(item: items[index], cart: cart),
            );
          },
        ),
      ),
      bottomNavigationBar: cart.itemCount == 0
          ? null
          : SafeArea(
              child: Padding(
                padding: const EdgeInsets.all(RaSpace.pageGutter),
                child: ElevatedButton(
                  onPressed: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const CartScreen())),
                  child: Text('View cart (${cart.itemCount}) · ${formatMoney(cart.totalMinor, cart.items.first.currency)}'),
                ),
              ),
            ),
    );
  }
}

class _MenuItemCard extends StatelessWidget {
  const _MenuItemCard({required this.item, required this.cart});

  final MenuItem item;
  final Cart cart;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(RaSpace.s4),
      decoration: BoxDecoration(
        color: RaColors.surface,
        borderRadius: BorderRadius.circular(RaRadius.card),
        border: Border.all(color: RaColors.border),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(item.name, style: const TextStyle(fontSize: RaText.base, fontWeight: FontWeight.w600)),
                if (item.description != null)
                  Text(item.description!, style: const TextStyle(fontSize: RaText.sm, color: RaColors.textSecondary)),
                const SizedBox(height: RaSpace.s1),
                Text(
                  formatMoney(item.priceMinor, item.currency),
                  style: const TextStyle(fontSize: RaText.sm, fontWeight: FontWeight.w600, color: RaColors.accent),
                ),
              ],
            ),
          ),
          const SizedBox(width: RaSpace.s3),
          if (item.isSoldOut)
            const Text('Sold out', style: TextStyle(color: RaColors.textSecondary, fontSize: RaText.sm))
          else
            FilledButton(
              onPressed: () => cart.addItem(
                CartItem(menuItemId: item.id, name: item.name, priceMinor: item.priceMinor, currency: item.currency, quantity: 0),
              ),
              child: const Text('Add'),
            ),
        ],
      ),
    );
  }
}
