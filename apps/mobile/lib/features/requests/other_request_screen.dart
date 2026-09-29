import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../theme/tokens.dart';
import '../connect/hotel_session_holder.dart';
import 'freetext_service.dart';
import 'request_detail_screen.dart';

class OtherRequestScreen extends StatefulWidget {
  const OtherRequestScreen({super.key});

  @override
  State<OtherRequestScreen> createState() => _OtherRequestScreenState();
}

class _OtherRequestScreenState extends State<OtherRequestScreen> {
  late final _freetextService = FreetextService(Supabase.instance.client);
  final _textController = TextEditingController();
  bool _submitting = false;
  String? _errorMessage;

  @override
  void dispose() {
    _textController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final text = _textController.text.trim();
    if (text.isEmpty) return;
    final hotelSession = context.read<HotelSessionHolder>().session!;

    setState(() {
      _submitting = true;
      _errorMessage = null;
    });
    try {
      // Native app is English-only for now (no locale switching yet), so
      // both sides of the translation call are 'en' — a same-language
      // round trip until that changes, matching how the mock provider
      // already behaves in that case.
      const locale = 'en';
      final translated = await _freetextService.translateContent(
        text: text,
        sourceLocale: locale,
        targetLocale: locale,
      );
      final departmentId = await _freetextService.resolveFreetextDepartment(translated.text);
      if (departmentId == null) {
        setState(() => _errorMessage = "This hotel hasn't set up where to route this request yet.");
        return;
      }
      final requestId = await _freetextService.createFreetextRequest(
        hotelId: hotelSession.hotelId,
        roomId: hotelSession.roomId,
        guestSessionId: hotelSession.guestSessionId,
        departmentId: departmentId,
        originalText: text,
        originalLocale: locale,
        translated: translated,
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
    return Scaffold(
      appBar: AppBar(title: const Text('What do you need?')),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(RaSpace.pageGutter),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Text(
                'Type your request in your own language — we\'ll take care of the rest.',
                style: TextStyle(color: RaColors.textSecondary),
              ),
              const SizedBox(height: RaSpace.s4),
              TextField(
                controller: _textController,
                autofocus: true,
                minLines: 5,
                maxLines: 8,
                decoration: const InputDecoration(border: OutlineInputBorder()),
              ),
              if (_errorMessage != null) ...[
                const SizedBox(height: RaSpace.s3),
                Text(_errorMessage!, style: const TextStyle(color: RaColors.danger)),
              ],
              const SizedBox(height: RaSpace.s4),
              ElevatedButton(
                onPressed: _submitting ? null : _submit,
                child: _submitting
                    ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2))
                    : const Text('Send request'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
