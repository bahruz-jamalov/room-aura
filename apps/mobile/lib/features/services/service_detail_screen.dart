import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../shared/money.dart';
import '../../theme/tokens.dart';
import '../catalogue/catalogue_models.dart';
import '../connect/hotel_session_holder.dart';
import '../requests/request_detail_screen.dart';
import '../requests/requests_service.dart';

String _formatScheduledFor(DateTime dt) {
  final hour = dt.hour.toString().padLeft(2, '0');
  final minute = dt.minute.toString().padLeft(2, '0');
  return '${dt.day}/${dt.month}/${dt.year} $hour:$minute';
}

class ServiceDetailScreen extends StatefulWidget {
  const ServiceDetailScreen({super.key, required this.service});

  final ServiceItem service;

  @override
  State<ServiceDetailScreen> createState() => _ServiceDetailScreenState();
}

class _ServiceDetailScreenState extends State<ServiceDetailScreen> {
  late final _requestsService = RequestsService(Supabase.instance.client);
  int _quantity = 1;
  final _noteController = TextEditingController();
  DateTime? _scheduledFor;
  bool _submitting = false;
  String? _errorMessage;

  Future<void> _pickDateTime() async {
    final now = DateTime.now();
    final date = await showDatePicker(
      context: context,
      initialDate: _scheduledFor ?? now,
      firstDate: now,
      lastDate: now.add(const Duration(days: 365)),
    );
    if (date == null || !mounted) return;
    final time = await showTimePicker(
      context: context,
      initialTime: _scheduledFor != null ? TimeOfDay.fromDateTime(_scheduledFor!) : TimeOfDay.fromDateTime(now),
    );
    if (time == null) return;
    setState(() => _scheduledFor = DateTime(date.year, date.month, date.day, time.hour, time.minute));
  }

  @override
  void dispose() {
    _noteController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (widget.service.requiresScheduling && _scheduledFor == null) {
      setState(() => _errorMessage = 'Please choose a date and time.');
      return;
    }
    final hotelSession = context.read<HotelSessionHolder>().session!;
    setState(() {
      _submitting = true;
      _errorMessage = null;
    });
    try {
      final requestId = await _requestsService.createServiceRequest(
        hotelId: hotelSession.hotelId,
        roomId: hotelSession.roomId,
        guestSessionId: hotelSession.guestSessionId,
        serviceId: widget.service.id,
        departmentId: widget.service.departmentId,
        quantity: _quantity,
        guestNote: _noteController.text.trim().isEmpty ? null : _noteController.text.trim(),
        requestedFor: _scheduledFor,
      );
      if (!mounted) return;
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(builder: (_) => RequestDetailScreen(requestId: requestId)),
      );
    } catch (e) {
      setState(() => _errorMessage = 'Something went wrong. Please try again.');
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final service = widget.service;
    return Scaffold(
      appBar: AppBar(title: Text(service.name)),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(RaSpace.pageGutter),
          children: [
            if (service.description != null) ...[
              Text(service.description!, style: const TextStyle(color: RaColors.textSecondary)),
              const SizedBox(height: RaSpace.s3),
            ],
            Text(
              service.isFree ? 'Free' : formatMoney(service.priceMinor, service.currency),
              style: const TextStyle(fontWeight: FontWeight.w700, color: RaColors.accent, fontSize: RaText.lg),
            ),
            if (service.expectedMinutes != null)
              Text('~${service.expectedMinutes} min', style: const TextStyle(color: RaColors.textSecondary)),
            const SizedBox(height: RaSpace.s6),
            if (service.allowsQuantity) ...[
              const Text('Quantity', style: TextStyle(fontWeight: FontWeight.w600)),
              const SizedBox(height: RaSpace.s2),
              Row(
                children: [
                  IconButton(
                    icon: const Icon(Icons.remove_circle_outline),
                    onPressed: _quantity > 1 ? () => setState(() => _quantity--) : null,
                  ),
                  Text('$_quantity', style: const TextStyle(fontSize: RaText.lg)),
                  IconButton(
                    icon: const Icon(Icons.add_circle_outline),
                    onPressed: _quantity < service.maxQuantity ? () => setState(() => _quantity++) : null,
                  ),
                ],
              ),
              const SizedBox(height: RaSpace.s4),
            ],
            if (service.requiresScheduling) ...[
              const Text('Date & time', style: TextStyle(fontWeight: FontWeight.w600)),
              const SizedBox(height: RaSpace.s2),
              OutlinedButton(
                onPressed: _pickDateTime,
                child: Text(_scheduledFor == null ? 'Choose date & time' : _formatScheduledFor(_scheduledFor!)),
              ),
              const SizedBox(height: RaSpace.s4),
            ],
            if (service.allowsNote) ...[
              TextField(
                controller: _noteController,
                decoration: const InputDecoration(labelText: 'Add a note (optional)'),
              ),
              const SizedBox(height: RaSpace.s4),
            ],
            if (_errorMessage != null) ...[
              Text(_errorMessage!, style: const TextStyle(color: RaColors.danger)),
              const SizedBox(height: RaSpace.s3),
            ],
            ElevatedButton(
              onPressed: _submitting ? null : _submit,
              child: _submitting
                  ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2))
                  : const Text('Send request'),
            ),
          ],
        ),
      ),
    );
  }
}
