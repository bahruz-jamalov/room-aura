import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../theme/tokens.dart';
import 'auth_service.dart';

// Not currently wired into the sign-up flow (see sign_up_screen.dart) —
// Supabase's default mailer can't show a bare OTP code in the "Confirm
// signup" email, only the confirmation link. Wire this back in once a
// custom SMTP provider is configured and the email template includes
// {{ .Token }}.
class OtpVerificationScreen extends StatefulWidget {
  const OtpVerificationScreen({super.key, required this.authService, required this.email});

  final AuthService authService;
  final String email;

  @override
  State<OtpVerificationScreen> createState() => _OtpVerificationScreenState();
}

class _OtpVerificationScreenState extends State<OtpVerificationScreen> {
  final _codeController = TextEditingController();
  bool _submitting = false;
  bool _resending = false;
  String? _errorMessage;
  String? _infoMessage;

  @override
  void dispose() {
    _codeController.dispose();
    super.dispose();
  }

  Future<void> _verify() async {
    final code = _codeController.text.trim();
    if (code.length != 6) {
      setState(() => _errorMessage = 'Enter the 6-digit code');
      return;
    }
    setState(() {
      _submitting = true;
      _errorMessage = null;
      _infoMessage = null;
    });
    try {
      await widget.authService.verifySignupOtp(email: widget.email, token: code);
      // AuthGate rebuilds the root route to the signed-in app now that
      // there's a session, but this screen is pushed on top of it — pop
      // back to reveal it, same fix as sign_up_screen.dart.
      if (mounted) Navigator.of(context).popUntil((route) => route.isFirst);
    } on AuthException catch (e) {
      setState(() => _errorMessage = e.message);
    } catch (e) {
      setState(() => _errorMessage = 'Something went wrong. Please try again.');
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  Future<void> _resend() async {
    setState(() {
      _resending = true;
      _errorMessage = null;
      _infoMessage = null;
    });
    try {
      await widget.authService.resendSignupOtp(widget.email);
      setState(() => _infoMessage = 'New code sent.');
    } on AuthException catch (e) {
      setState(() => _errorMessage = e.message);
    } catch (e) {
      setState(() => _errorMessage = 'Could not resend the code. Please try again.');
    } finally {
      if (mounted) setState(() => _resending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Enter code')),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(RaSpace.pageGutter),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const SizedBox(height: RaSpace.s8),
              const Icon(Icons.mark_email_read, size: 48, color: RaColors.accent),
              const SizedBox(height: RaSpace.s4),
              Text(
                'We sent a 6-digit code to ${widget.email}',
                textAlign: TextAlign.center,
                style: const TextStyle(color: RaColors.textSecondary),
              ),
              const SizedBox(height: RaSpace.s6),
              TextField(
                controller: _codeController,
                keyboardType: TextInputType.number,
                textAlign: TextAlign.center,
                maxLength: 6,
                autofillHints: const [AutofillHints.oneTimeCode],
                inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                style: const TextStyle(fontSize: RaText.xxl, letterSpacing: 8, fontWeight: FontWeight.w600),
                decoration: const InputDecoration(counterText: '', hintText: '000000'),
                onSubmitted: (_) => _verify(),
              ),
              if (_errorMessage != null) ...[
                const SizedBox(height: RaSpace.s2),
                Text(_errorMessage!, style: const TextStyle(color: RaColors.danger), textAlign: TextAlign.center),
              ],
              if (_infoMessage != null) ...[
                const SizedBox(height: RaSpace.s2),
                Text(_infoMessage!, style: const TextStyle(color: RaColors.success), textAlign: TextAlign.center),
              ],
              const SizedBox(height: RaSpace.s6),
              ElevatedButton(
                onPressed: _submitting ? null : _verify,
                child: _submitting
                    ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2))
                    : const Text('Verify'),
              ),
              const SizedBox(height: RaSpace.s4),
              TextButton(
                onPressed: _resending ? null : _resend,
                child: Text(_resending ? 'Sending…' : "Didn't get a code? Resend"),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
