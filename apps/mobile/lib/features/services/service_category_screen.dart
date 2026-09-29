import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../shared/money.dart';
import '../../theme/tokens.dart';
import '../catalogue/catalogue_models.dart';
import '../catalogue/catalogue_service.dart';
import 'service_detail_screen.dart';

class ServiceCategoryScreen extends StatefulWidget {
  const ServiceCategoryScreen({super.key, required this.category});

  final ServiceCategory category;

  @override
  State<ServiceCategoryScreen> createState() => _ServiceCategoryScreenState();
}

class _ServiceCategoryScreenState extends State<ServiceCategoryScreen> {
  late final _catalogueService = CatalogueService(Supabase.instance.client);
  late final Future<List<ServiceItem>> _servicesFuture =
      _catalogueService.fetchServicesByCategory(widget.category.id, locale: 'en', fallbackLocale: 'en');

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(widget.category.name)),
      body: SafeArea(
        child: FutureBuilder<List<ServiceItem>>(
          future: _servicesFuture,
          builder: (context, snapshot) {
            if (!snapshot.hasData) return const Center(child: CircularProgressIndicator());
            final services = snapshot.data!;
            if (services.isEmpty) {
              return const Center(child: Text('—', style: TextStyle(color: RaColors.textSecondary)));
            }
            return ListView.separated(
              padding: const EdgeInsets.all(RaSpace.pageGutter),
              itemCount: services.length,
              separatorBuilder: (_, _) => const SizedBox(height: RaSpace.s3),
              itemBuilder: (context, index) {
                final service = services[index];
                return Material(
                  color: RaColors.surface,
                  borderRadius: BorderRadius.circular(RaRadius.card),
                  child: InkWell(
                    borderRadius: BorderRadius.circular(RaRadius.card),
                    onTap: () => Navigator.of(context).push(
                      MaterialPageRoute(builder: (_) => ServiceDetailScreen(service: service)),
                    ),
                    child: Container(
                      padding: const EdgeInsets.all(RaSpace.s4),
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(RaRadius.card),
                        border: Border.all(color: RaColors.border),
                      ),
                      child: Row(
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(service.name, style: const TextStyle(fontSize: RaText.base, fontWeight: FontWeight.w600)),
                                if (service.description != null)
                                  Text(
                                    service.description!,
                                    style: const TextStyle(fontSize: RaText.sm, color: RaColors.textSecondary),
                                  ),
                                Text(
                                  service.isFree ? 'Free' : formatMoney(service.priceMinor, service.currency),
                                  style: const TextStyle(fontSize: RaText.sm, fontWeight: FontWeight.w600, color: RaColors.accent),
                                ),
                              ],
                            ),
                          ),
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
