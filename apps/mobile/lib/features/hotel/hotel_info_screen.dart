import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../theme/tokens.dart';
import '../connect/hotel_session.dart';

class HotelInfoScreen extends StatefulWidget {
  const HotelInfoScreen({super.key, required this.hotelSession});

  final HotelSession hotelSession;

  @override
  State<HotelInfoScreen> createState() => _HotelInfoScreenState();
}

class _HotelInfoScreenState extends State<HotelInfoScreen> {
  Map<String, dynamic>? _settings;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  // No .eq() needed — RLS already scopes this to the guest's own hotel.
  Future<void> _load() async {
    final row = await Supabase.instance.client
        .from('hotel_settings')
        .select('about, address, contact_phone, checkin_time, checkout_time')
        .maybeSingle();
    if (mounted) {
      setState(() {
        _settings = row;
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final settings = _settings;
    final hasAnyDetail = settings != null &&
        (settings['about'] != null ||
            settings['address'] != null ||
            settings['contact_phone'] != null ||
            settings['checkin_time'] != null ||
            settings['checkout_time'] != null);

    return Scaffold(
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(RaSpace.pageGutter),
          children: [
            const SizedBox(height: RaSpace.s4),
            Center(
              child: Text(
                widget.hotelSession.hotelName,
                style: const TextStyle(fontSize: RaText.xxl, fontWeight: FontWeight.w700, color: RaColors.textPrimary),
              ),
            ),
            const SizedBox(height: RaSpace.s6),
            if (_loading)
              const Center(child: CircularProgressIndicator())
            else if (!hasAnyDetail)
              const Center(child: Text('—', style: TextStyle(color: RaColors.textSecondary)))
            else ...[
              if (settings['about'] != null) ...[
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(RaSpace.s4),
                  decoration: BoxDecoration(
                    color: RaColors.surface,
                    borderRadius: BorderRadius.circular(RaRadius.card),
                    border: Border.all(color: RaColors.border),
                  ),
                  child: Text(settings['about'] as String),
                ),
                const SizedBox(height: RaSpace.s3),
              ],
              Container(
                padding: const EdgeInsets.all(RaSpace.s4),
                decoration: BoxDecoration(
                  color: RaColors.surface,
                  borderRadius: BorderRadius.circular(RaRadius.card),
                  border: Border.all(color: RaColors.border),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    if (settings['address'] != null) _InfoRow(label: 'Address', value: settings['address'] as String),
                    if (settings['contact_phone'] != null) _InfoRow(label: 'Phone', value: settings['contact_phone'] as String),
                    if (settings['checkin_time'] != null) _InfoRow(label: 'Check-in', value: settings['checkin_time'] as String),
                    if (settings['checkout_time'] != null) _InfoRow(label: 'Check-out', value: settings['checkout_time'] as String),
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  const _InfoRow({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: RaSpace.s1),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(color: RaColors.textSecondary)),
          Text(value, style: const TextStyle(fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }
}
