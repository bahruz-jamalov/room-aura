import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../shared/request_state_machine.dart';
import '../../theme/tokens.dart';
import '../connect/hotel_session_holder.dart';
import 'request_detail_screen.dart';
import 'request_models.dart';
import 'requests_service.dart';

class MyRequestsScreen extends StatefulWidget {
  const MyRequestsScreen({super.key});

  @override
  State<MyRequestsScreen> createState() => _MyRequestsScreenState();
}

class _MyRequestsScreenState extends State<MyRequestsScreen> {
  late final _requestsService = RequestsService(Supabase.instance.client);
  List<RequestSummary>? _requests;
  RealtimeChannel? _channel;

  @override
  void initState() {
    super.initState();
    final hotelSession = context.read<HotelSessionHolder>().session!;
    _load();
    _channel = _requestsService.subscribeToMyRequests(hotelSession.guestSessionId, _load);
  }

  @override
  void dispose() {
    if (_channel != null) Supabase.instance.client.removeChannel(_channel!);
    super.dispose();
  }

  Future<void> _load() async {
    final requests = await _requestsService.fetchMyRequests(locale: 'en', fallbackLocale: 'en');
    if (!mounted) return;
    setState(() => _requests = requests);
  }

  @override
  Widget build(BuildContext context) {
    final requests = _requests;
    return Scaffold(
      appBar: AppBar(title: const Text('My Requests')),
      body: SafeArea(
        child: requests == null
            ? const Center(child: CircularProgressIndicator())
            : requests.isEmpty
                ? const Center(child: Text('No requests yet', style: TextStyle(color: RaColors.textSecondary)))
                : RefreshIndicator(
                    onRefresh: _load,
                    child: ListView.separated(
                      padding: const EdgeInsets.all(RaSpace.pageGutter),
                      itemCount: requests.length,
                      separatorBuilder: (_, _) => const SizedBox(height: RaSpace.s3),
                      itemBuilder: (context, index) => _RequestTile(request: requests[index]),
                    ),
                  ),
      ),
    );
  }
}

class _RequestTile extends StatelessWidget {
  const _RequestTile({required this.request});

  final RequestSummary request;

  @override
  Widget build(BuildContext context) {
    final label = statusLabel(request.kind, request.status);
    final isTerminalStatus = isTerminal(request.status);
    return Material(
      color: RaColors.surface,
      borderRadius: BorderRadius.circular(RaRadius.card),
      child: InkWell(
        borderRadius: BorderRadius.circular(RaRadius.card),
        onTap: () => Navigator.of(context).push(
          MaterialPageRoute(builder: (_) => RequestDetailScreen(requestId: request.id)),
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
                    Text(request.displayText, style: const TextStyle(fontWeight: FontWeight.w600)),
                    Text('#${request.number}', style: const TextStyle(fontSize: RaText.xs, color: RaColors.textSecondary)),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: RaSpace.s3, vertical: RaSpace.s1),
                decoration: BoxDecoration(
                  color: isTerminalStatus ? RaColors.surfaceSunken : RaColors.accentSoft,
                  borderRadius: BorderRadius.circular(RaRadius.full),
                ),
                child: Text(
                  label,
                  style: TextStyle(
                    fontSize: RaText.xs,
                    fontWeight: FontWeight.w600,
                    color: isTerminalStatus ? RaColors.textSecondary : RaColors.accent,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
