import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../theme/tokens.dart';
import '../catalogue/catalogue_models.dart';
import '../catalogue/catalogue_service.dart';
import '../menu/menu_categories_screen.dart';
import '../services/service_category_screen.dart';

/// Shown for a group tile (e.g. "Explore the City") instead of a service
/// list or a menu — lists its children, one level deep. See
/// 00000000000027_multi_shop_menus.sql for why "has children" is derived
/// rather than its own category_type.
class CategoryGroupScreen extends StatefulWidget {
  const CategoryGroupScreen({super.key, required this.category});

  final ServiceCategory category;

  @override
  State<CategoryGroupScreen> createState() => _CategoryGroupScreenState();
}

class _CategoryGroupScreenState extends State<CategoryGroupScreen> {
  late final _catalogueService = CatalogueService(Supabase.instance.client);
  late final Future<List<ServiceCategory>> _childrenFuture = _catalogueService.fetchCategories(
    parentCategoryId: widget.category.id,
    locale: 'en',
    fallbackLocale: 'en',
  );

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(widget.category.name)),
      body: SafeArea(
        child: FutureBuilder<List<ServiceCategory>>(
          future: _childrenFuture,
          builder: (context, snapshot) {
            if (!snapshot.hasData) return const Center(child: CircularProgressIndicator());
            final children = snapshot.data!;
            if (children.isEmpty) {
              return const Center(child: Text('—', style: TextStyle(color: RaColors.textSecondary)));
            }
            return GridView.builder(
              padding: const EdgeInsets.all(RaSpace.pageGutter),
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 2,
                mainAxisSpacing: RaSpace.s3,
                crossAxisSpacing: RaSpace.s3,
                childAspectRatio: 1.1,
              ),
              itemCount: children.length,
              itemBuilder: (context, index) => _ChildCategoryCard(category: children[index]),
            );
          },
        ),
      ),
    );
  }
}

class _ChildCategoryCard extends StatelessWidget {
  const _ChildCategoryCard({required this.category});

  final ServiceCategory category;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: RaColors.surface,
      borderRadius: BorderRadius.circular(RaRadius.card),
      child: InkWell(
        borderRadius: BorderRadius.circular(RaRadius.card),
        onTap: () => Navigator.of(context).push(
          MaterialPageRoute(
            builder: (_) => category.isMenu ? MenuCategoriesScreen(category: category) : ServiceCategoryScreen(category: category),
          ),
        ),
        child: Container(
          padding: const EdgeInsets.all(RaSpace.s4),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(RaRadius.card),
            border: Border.all(color: RaColors.border),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisAlignment: MainAxisAlignment.end,
            children: [
              Text(category.icon ?? '•', style: const TextStyle(fontSize: 28)),
              const SizedBox(height: RaSpace.s2),
              Text(
                category.name,
                style: const TextStyle(fontSize: RaText.base, fontWeight: FontWeight.w600, color: RaColors.textPrimary),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
