import 'dart:async';
import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import '../../theme/tokens.dart';
import 'enter_code_screen.dart';
import 'hotel_session.dart';
import 'hotel_session_service.dart';

/// The QR sticker encodes a full URL (`<touristAppUrl>/j/:token>` — see
/// apps/admin/src/screens/AccessScreen.tsx). Accept that shape, but fall
/// back to treating the whole scanned value as a raw token so a bare code
/// (or a future non-URL QR format) still works.
String _extractToken(String rawValue) {
  final trimmed = rawValue.trim();
  final uri = Uri.tryParse(trimmed);
  if (uri != null && uri.hasScheme) {
    final segments = uri.pathSegments;
    final jIndex = segments.indexOf('j');
    if (jIndex != -1 && jIndex + 1 < segments.length) {
      return segments[jIndex + 1];
    }
  }
  return trimmed;
}

class ConnectScreen extends StatefulWidget {
  const ConnectScreen({super.key, required this.hotelSessionService, required this.onConnected});

  final HotelSessionService hotelSessionService;
  final void Function(HotelSession session) onConnected;

  @override
  State<ConnectScreen> createState() => _ConnectScreenState();
}

class _ConnectScreenState extends State<ConnectScreen> {
  final _controller = MobileScannerController();
  bool _processing = false;
  String? _errorMessage;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _onDetect(BarcodeCapture capture) async {
    if (_processing) return;
    final rawValue = capture.barcodes.isEmpty ? null : capture.barcodes.first.rawValue;
    if (rawValue == null) return;

    setState(() {
      _processing = true;
      _errorMessage = null;
    });
    unawaited(_controller.stop());

    final token = _extractToken(rawValue);
    try {
      final session = await widget.hotelSessionService.redeemAccess(token: token, locale: 'en');
      widget.onConnected(session);
    } on RedeemFailure catch (e) {
      if (e.code == RedeemErrorCode.roomRequired) {
        if (!mounted) return;
        await Navigator.of(context).push(
          MaterialPageRoute(
            builder: (_) => EnterCodeScreen(
              hotelSessionService: widget.hotelSessionService,
              onConnected: widget.onConnected,
              initialToken: token,
            ),
          ),
        );
      } else {
        setState(() => _errorMessage = "That QR code didn't work. Try again or enter a code manually.");
      }
      await _controller.start();
    } finally {
      if (mounted) setState(() => _processing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      body: SafeArea(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.all(RaSpace.pageGutter),
              child: Column(
                children: [
                  const Text(
                    'Scan your room QR code',
                    style: TextStyle(color: Colors.white, fontSize: RaText.xl, fontWeight: FontWeight.w600),
                  ),
                  const SizedBox(height: RaSpace.s2),
                  Text(
                    'Usually a sticker near the door or on the desk.',
                    style: TextStyle(color: Colors.white.withValues(alpha: 0.7), fontSize: RaText.sm),
                  ),
                ],
              ),
            ),
            Expanded(
              child: Stack(
                fit: StackFit.expand,
                children: [
                  MobileScanner(controller: _controller, onDetect: _onDetect),
                  if (_processing) const Center(child: CircularProgressIndicator(color: RaColors.accent)),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(RaSpace.pageGutter),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  if (_errorMessage != null) ...[
                    Text(_errorMessage!, style: const TextStyle(color: RaColors.danger), textAlign: TextAlign.center),
                    const SizedBox(height: RaSpace.s3),
                  ],
                  OutlinedButton(
                    style: OutlinedButton.styleFrom(
                      minimumSize: const Size.fromHeight(RaSize.touchTarget),
                      foregroundColor: Colors.white,
                      side: const BorderSide(color: Colors.white54),
                    ),
                    onPressed: () => Navigator.of(context).push(
                      MaterialPageRoute(
                        builder: (_) => EnterCodeScreen(
                          hotelSessionService: widget.hotelSessionService,
                          onConnected: widget.onConnected,
                        ),
                      ),
                    ),
                    child: const Text('Enter code instead'),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
