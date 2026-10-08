import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../theme/tokens.dart';
import '../catalogue/catalogue_models.dart';
import '../catalogue/catalogue_service.dart';
import 'menu_items_screen.dart';

class MenuCategoriesScreen extends StatefulWidget {
  const MenuCategoriesScreen({super.key, required this.category});

  final ServiceCategory category;

  @override
  State<MenuCategoriesScreen> createState() => _MenuCategoriesScreenState();
}

class _MenuCategoriesScreenState extends State<MenuCategoriesScreen> {
  late final _catalogueService = CatalogueService(Supabase.instance.client);
  late final Future<List<MenuCategory>> _categoriesFuture = _catalogueService.fetchMenuCategories(
    serviceCategoryId: widget.category.id,
    locale: 'en',
    fallbackLocale: 'en',
  );

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(widget.category.name)),
      body: SafeArea(
        child: FutureBuilder<List<MenuCategory>>(
          future: _categoriesFuture,
          builder: (context, snapshot) {
            if (!snapshot.hasData) return const Center(child: CircularProgressIndicator());
            final categories = snapshot.data!;
            if (categories.isEmpty) {
              return const Center(child: Text('—', style: TextStyle(color: RaColors.textSecondary)));
            }
            return ListView.separated(
              padding: const EdgeInsets.all(RaSpace.pageGutter),
              itemCount: categories.length,
              separatorBuilder: (_, _) => const SizedBox(height: RaSpace.s3),
              itemBuilder: (context, index) {
                final category = categories[index];
                return Material(
                  color: RaColors.surface,
                  borderRadius: BorderRadius.circular(RaRadius.card),
                  child: InkWell(
                    borderRadius: BorderRadius.circular(RaRadius.card),
                    onTap: () => Navigator.of(context).push(
                      MaterialPageRoute(builder: (_) => MenuItemsScreen(category: category)),
                    ),
                    child: Container(
                      padding: const EdgeInsets.all(RaSpace.s4),
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(RaRadius.card),
                        border: Border.all(color: RaColors.border),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(category.name, style: const TextStyle(fontSize: RaText.base, fontWeight: FontWeight.w600)),
                          const Icon(Icons.chevron_right, color: RaColors.textSecondary),
                        ],
                      ),
                    ),
                  ),
                );
              },
            );
          },
        ),
      ),
    );
  }
}
