import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../theme/tokens.dart';
import '../catalogue/catalogue_models.dart';
import '../catalogue/catalogue_service.dart';
import '../connect/hotel_session.dart';
import '../menu/menu_categories_screen.dart';
import '../notifications/notifications_screen.dart';
import '../notifications/notifications_service.dart';
import '../requests/other_request_screen.dart';
import '../services/service_category_screen.dart';
import 'category_group_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key, required this.hotelSession});

  final HotelSession hotelSession;

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  late final _catalogueService = CatalogueService(Supabase.instance.client);
  late final _notificationsService = NotificationsService(Supabase.instance.client);
  late Future<List<ServiceCategory>> _categoriesFuture;
  int _unreadNotifications = 0;
  RealtimeChannel? _notificationsChannel;

  @override
  void initState() {
    super.initState();
    _categoriesFuture = _catalogueService.fetchCategories(
      locale: 'en',
      fallbackLocale: 'en',
    );
    _loadUnreadNotifications();
    _notificationsChannel = _notificationsService.subscribeToMyNotifications(
      widget.hotelSession.guestSessionId,
      (_) => setState(() => _unreadNotifications++),
    );
  }

  @override
  void dispose() {
    if (_notificationsChannel != null) Supabase.instance.client.removeChannel(_notificationsChannel!);
    super.dispose();
  }

  Future<void> _loadUnreadNotifications() async {
    final count = await _notificationsService.fetchUnreadCount();
    if (!mounted) return;
    setState(() => _unreadNotifications = count);
  }

  Future<void> _openNotifications() async {
    await Navigator.of(context).push(MaterialPageRoute(builder: (_) => const NotificationsScreen()));
    _loadUnreadNotifications();
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: CustomScrollView(
        slivers: [
          SliverPadding(
            padding: const EdgeInsets.all(RaSpace.pageGutter),
            sliver: SliverToBoxAdapter(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        child: Text(
                          widget.hotelSession.hotelName,
                          style: const TextStyle(fontSize: RaText.xxl, fontWeight: FontWeight.w700, color: RaColors.textPrimary),
                        ),
                      ),
                      IconButton(
                        onPressed: _openNotifications,
                        icon: Badge(
                          isLabelVisible: _unreadNotifications > 0,
                          label: Text('$_unreadNotifications'),
                          child: const Icon(Icons.notifications_outlined, color: RaColors.textPrimary),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: RaSpace.s1),
                  Text(
                    'Room ${widget.hotelSession.roomNumber}',
                    style: const TextStyle(fontSize: RaText.base, color: RaColors.textSecondary),
                  ),
                  const SizedBox(height: RaSpace.s6),
                  const Text(
                    'How can we help?',
                    style: TextStyle(fontSize: RaText.lg, fontWeight: FontWeight.w600, color: RaColors.textPrimary),
                  ),
                ],
              ),
            ),
          ),
          SliverPadding(
            padding: const EdgeInsets.symmetric(horizontal: RaSpace.pageGutter),
            sliver: FutureBuilder<List<ServiceCategory>>(
              future: _categoriesFuture,
              builder: (context, snapshot) {
                if (!snapshot.hasData) {
                  return const SliverToBoxAdapter(
                    child: Padding(
                      padding: EdgeInsets.only(top: RaSpace.s8),
                      child: Center(child: CircularProgressIndicator()),
                    ),
                  );
                }
                final categories = snapshot.data!;
                return SliverGrid(
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 2,
                    mainAxisSpacing: RaSpace.s3,
                    crossAxisSpacing: RaSpace.s3,
                    childAspectRatio: 1.1,
                  ),
                  delegate: SliverChildBuilderDelegate(
                    (context, index) => _CategoryCard(category: categories[index]),
                    childCount: categories.length,
                  ),
                );
              },
            ),
          ),
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(RaSpace.pageGutter, RaSpace.s6, RaSpace.pageGutter, RaSpace.s8),
            sliver: SliverToBoxAdapter(
              child: OutlinedButton(
                onPressed: () => Navigator.of(context).push(
                  MaterialPageRoute(builder: (_) => const OtherRequestScreen()),
                ),
                style: OutlinedButton.styleFrom(minimumSize: const Size.fromHeight(RaSize.touchTarget)),
                child: const Text('Something else? Ask us anything'),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _CategoryCard extends StatelessWidget {
  const _CategoryCard({required this.category});

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
            builder: (_) => category.hasChildren
                ? CategoryGroupScreen(category: category)
                : category.isMenu
                    ? MenuCategoriesScreen(category: category)
                    : ServiceCategoryScreen(category: category),
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
