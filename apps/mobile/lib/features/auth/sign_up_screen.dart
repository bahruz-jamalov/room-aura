import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../theme/tokens.dart';
import 'auth_service.dart';

class SignUpScreen extends StatefulWidget {
  const SignUpScreen({super.key, required this.authService});

  final AuthService authService;

  @override
  State<SignUpScreen> createState() => _SignUpScreenState();
}

class _SignUpScreenState extends State<SignUpScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _submitting = false;
  String? _errorMessage;
  bool _checkEmail = false;

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _submitting = true;
      _errorMessage = null;
    });
    try {
      await widget.authService.signUp(
        fullName: _nameController.text.trim(),
        email: _emailController.text.trim(),
        password: _passwordController.text,
      );
      // If email confirmation is required, there's no session yet — tell
      // the guest to check their inbox instead of assuming they're in.
      // (OTP-code entry — see otp_verification_screen.dart — needs a
      // custom SMTP provider configured in Supabase before the "Confirm
      // signup" email template can show a bare code; the default Supabase
      // mailer only supports the link below.)
      if (widget.authService.currentUser == null) {
        setState(() => _checkEmail = true);
      } else if (mounted) {
        // No confirmation required — already signed in. AuthGate rebuilt
        // its root route to the signed-in app, but this screen is pushed
        // on top of that root, so it has to pop itself to reveal it.
        Navigator.of(context).popUntil((route) => route.isFirst);
      }
    } on AuthException catch (e) {
      setState(() => _errorMessage = e.message);
    } catch (e) {
      setState(() => _errorMessage = 'Something went wrong. Please try again.');
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Create account')),
      body: SafeArea(
        child: _checkEmail ? _CheckEmailNotice(email: _emailController.text.trim()) : _buildForm(),
      ),
    );
  }

  Widget _buildForm() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(RaSpace.pageGutter),
      child: Form(
        key: _formKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            TextFormField(
              controller: _nameController,
              textCapitalization: TextCapitalization.words,
              autofillHints: const [AutofillHints.name],
              decoration: const InputDecoration(labelText: 'Full name'),
              validator: (value) => (value == null || value.trim().isEmpty) ? 'Enter your name' : null,
            ),
            const SizedBox(height: RaSpace.s4),
            TextFormField(
              controller: _emailController,
              keyboardType: TextInputType.emailAddress,
              autofillHints: const [AutofillHints.email],
              decoration: const InputDecoration(labelText: 'Email'),
              validator: (value) => (value == null || !value.contains('@')) ? 'Enter a valid email' : null,
            ),
            const SizedBox(height: RaSpace.s4),
            TextFormField(
              controller: _passwordController,
              obscureText: true,
              autofillHints: const [AutofillHints.newPassword],
              decoration: const InputDecoration(labelText: 'Password', helperText: 'At least 8 characters'),
              validator: (value) => (value == null || value.length < 8) ? 'Use at least 8 characters' : null,
            ),
            if (_errorMessage != null) ...[
              const SizedBox(height: RaSpace.s4),
              Text(_errorMessage!, style: const TextStyle(color: RaColors.danger), textAlign: TextAlign.center),
            ],
            const SizedBox(height: RaSpace.s6),
            ElevatedButton(
              onPressed: _submitting ? null : _submit,
              child: _submitting
                  ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2))
                  : const Text('Create account'),
            ),
          ],
        ),
      ),
    );
  }
}

class _CheckEmailNotice extends StatelessWidget {
  const _CheckEmailNotice({required this.email});

  final String email;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(RaSpace.pageGutter),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.mark_email_read, size: 48, color: RaColors.accent),
          const SizedBox(height: RaSpace.s4),
          const Text(
            'Check your email',
            style: TextStyle(fontSize: RaText.xl, fontWeight: FontWeight.w600, color: RaColors.textPrimary),
          ),
          const SizedBox(height: RaSpace.s2),
          Text(
            'We sent a confirmation link to $email. Open it, then come back and sign in.',
            textAlign: TextAlign.center,
            style: const TextStyle(color: RaColors.textSecondary),
          ),
        ],
      ),
    );
  }
}
