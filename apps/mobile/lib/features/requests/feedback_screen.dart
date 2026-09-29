import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../theme/tokens.dart';
import '../connect/hotel_session_holder.dart';
import 'feedback_service.dart';

class FeedbackScreen extends StatefulWidget {
  const FeedbackScreen({super.key, required this.requestId});

  final String requestId;

  @override
  State<FeedbackScreen> createState() => _FeedbackScreenState();
}

class _FeedbackScreenState extends State<FeedbackScreen> {
  late final _feedbackService = FeedbackService(Supabase.instance.client);
  final _commentController = TextEditingController();
  bool _loading = true;
  bool _alreadyRated = false;
  bool _submitted = false;
  bool _submitting = false;
  int _rating = 0;
  int _effortScore = 0;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _commentController.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    final existing = await _feedbackService.fetchFeedback(widget.requestId);
    if (!mounted) return;
    setState(() {
      _alreadyRated = existing != null;
      _loading = false;
    });
  }

  Future<void> _submit() async {
    if (_rating == 0 || _effortScore == 0) return;
    final hotelSession = context.read<HotelSessionHolder>().session!;
    setState(() => _submitting = true);
    try {
      await _feedbackService.submitFeedback(
        requestId: widget.requestId,
        hotelId: hotelSession.hotelId,
        guestSessionId: hotelSession.guestSessionId,
        rating: _rating,
        effortScore: _effortScore,
        comment: _commentController.text.trim().isEmpty ? null : _commentController.text.trim(),
      );
      if (mounted) setState(() => _submitted = true);
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Feedback')),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(RaSpace.pageGutter),
          child: _loading
              ? const Center(child: CircularProgressIndicator())
              : (_submitted || _alreadyRated)
                  ? const Center(
                      child: Text(
                        'Thank you!',
                        style: TextStyle(fontSize: RaText.xl, fontWeight: FontWeight.w700, color: RaColors.textPrimary),
                      ),
                    )
                  : Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        _StarPicker(label: 'How was your experience?', value: _rating, onChanged: (v) => setState(() => _rating = v)),
                        const SizedBox(height: RaSpace.s6),
                        _StarPicker(
                          label: 'How easy was it to get what you needed?',
                          value: _effortScore,
                          onChanged: (v) => setState(() => _effortScore = v),
                        ),
                        const SizedBox(height: RaSpace.s6),
                        TextField(
                          controller: _commentController,
                          minLines: 3,
                          maxLines: 5,
                          decoration: const InputDecoration(labelText: 'Comment (optional)', border: OutlineInputBorder()),
                        ),
                        const SizedBox(height: RaSpace.s6),
                        ElevatedButton(
                          onPressed: (_rating == 0 || _effortScore == 0 || _submitting) ? null : _submit,
                          child: _submitting
                              ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2))
                              : const Text('Submit'),
                        ),
                      ],
                    ),
        ),
      ),
    );
  }
}

class _StarPicker extends StatelessWidget {
  const _StarPicker({required this.label, required this.value, required this.onChanged});

  final String label;
  final int value;
  final void Function(int) onChanged;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text(label, style: const TextStyle(fontWeight: FontWeight.w600), textAlign: TextAlign.center),
        const SizedBox(height: RaSpace.s3),
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            for (var n = 1; n <= 5; n++)
              IconButton(
                iconSize: 36,
                onPressed: () => onChanged(n),
                icon: Icon(
                  n <= value ? Icons.star : Icons.star_border,
                  color: n <= value ? RaColors.accent : RaColors.border,
                ),
              ),
          ],
        ),
      ],
    );
  }
}
