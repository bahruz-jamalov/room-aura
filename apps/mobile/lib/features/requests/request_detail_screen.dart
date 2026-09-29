import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../shared/request_state_machine.dart';
import '../../theme/tokens.dart';
import 'feedback_screen.dart';
import 'feedback_service.dart';
import 'request_models.dart';
import 'requests_service.dart';

class RequestDetailScreen extends StatefulWidget {
  const RequestDetailScreen({super.key, required this.requestId});

  final String requestId;

  @override
  State<RequestDetailScreen> createState() => _RequestDetailScreenState();
}

class _RequestDetailScreenState extends State<RequestDetailScreen> {
  late final _requestsService = RequestsService(Supabase.instance.client);
  late final _feedbackService = FeedbackService(Supabase.instance.client);
  RequestDetail? _detail;
  bool _hasFeedback = false;
  RealtimeChannel? _channel;
  bool _cancelling = false;

  @override
  void initState() {
    super.initState();
    _load();
    _channel = _requestsService.subscribeToRequestDetail(widget.requestId, (detail) {
      if (!mounted) return;
      setState(() => _detail = detail);
      if (detail.status == RequestStatus.completed) _loadFeedbackStatus();
    });
  }

  Future<void> _loadFeedbackStatus() async {
    final existing = await _feedbackService.fetchFeedback(widget.requestId);
    if (mounted) setState(() => _hasFeedback = existing != null);
  }

  @override
  void dispose() {
    if (_channel != null) Supabase.instance.client.removeChannel(_channel!);
    super.dispose();
  }

  Future<void> _load() async {
    final detail = await _requestsService.fetchRequestDetail(widget.requestId);
    if (!mounted) return;
    setState(() => _detail = detail);
    if (detail?.status == RequestStatus.completed) _loadFeedbackStatus();
  }

  Future<void> _cancel() async {
    final detail = _detail;
    if (detail == null) return;
    setState(() => _cancelling = true);
    await _requestsService.cancelRequest(detail.id);
    if (mounted) setState(() => _cancelling = false);
  }

  @override
  Widget build(BuildContext context) {
    final detail = _detail;
    return Scaffold(
      appBar: AppBar(title: Text(detail == null ? 'Request' : '#${detail.number}')),
      body: SafeArea(
        child: detail == null
            ? const Center(child: CircularProgressIndicator())
            : Padding(
                padding: const EdgeInsets.all(RaSpace.pageGutter),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    if (detail.status == RequestStatus.cancelled)
                      const Text('This request was cancelled.', style: TextStyle(color: RaColors.danger))
                    else
                      _Tracker(kind: detail.kind, status: detail.status),
                    const SizedBox(height: RaSpace.s6),
                    if (detail.originalText != null) ...[
                      Text(detail.originalText!, style: const TextStyle(fontSize: RaText.base)),
                      const SizedBox(height: RaSpace.s3),
                    ],
                    if (detail.guestNote != null) ...[
                      Text('Note: ${detail.guestNote}', style: const TextStyle(color: RaColors.textSecondary)),
                      const SizedBox(height: RaSpace.s3),
                    ],
                    if (detail.estimatedMinutes != null)
                      Text('Estimated: ~${detail.estimatedMinutes} min', style: const TextStyle(color: RaColors.textSecondary)),
                    const Spacer(),
                    if (detail.status == RequestStatus.completed && !_hasFeedback) ...[
                      ElevatedButton(
                        onPressed: () => Navigator.of(context).push(
                          MaterialPageRoute(builder: (_) => FeedbackScreen(requestId: detail.id)),
                        ),
                        child: const Text('Rate your experience'),
                      ),
                      const SizedBox(height: RaSpace.s3),
                    ],
                    if (canGuestCancel(detail.status))
                      OutlinedButton(
                        onPressed: _cancelling ? null : _cancel,
                        style: OutlinedButton.styleFrom(foregroundColor: RaColors.danger),
                        child: _cancelling
                            ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2))
                            : const Text('Cancel request'),
                      ),
                  ],
                ),
              ),
      ),
    );
  }
}

class _Tracker extends StatelessWidget {
  const _Tracker({required this.kind, required this.status});

  final RequestKind kind;
  final RequestStatus status;

  @override
  Widget build(BuildContext context) {
    final dots = Row(
      children: [
        for (final step in trackerSteps) ...[
          _TrackerDot(state: trackerStepState(status, step)),
          if (step != trackerSteps.last)
            Expanded(
              child: Container(
                height: 2,
                color: trackerStepState(status, step) == TrackerStepState.done ? RaColors.success : RaColors.border,
              ),
            ),
        ],
      ],
    );
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        dots,
        const SizedBox(height: RaSpace.s2),
        Text(
          statusLabel(kind, status),
          style: const TextStyle(fontWeight: FontWeight.w700, fontSize: RaText.lg, color: RaColors.textPrimary),
        ),
      ],
    );
  }
}

class _TrackerDot extends StatelessWidget {
  const _TrackerDot({required this.state});

  final TrackerStepState state;

  @override
  Widget build(BuildContext context) {
    final color = switch (state) {
      TrackerStepState.done => RaColors.success,
      TrackerStepState.active => RaColors.accent,
      TrackerStepState.pending => RaColors.border,
    };
    return Container(
      width: 16,
      height: 16,
      decoration: BoxDecoration(shape: BoxShape.circle, color: color),
    );
  }
}
