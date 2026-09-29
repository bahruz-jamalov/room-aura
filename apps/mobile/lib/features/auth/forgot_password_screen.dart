import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../theme/tokens.dart';
import 'auth_service.dart';

class ForgotPasswordScreen extends StatefulWidget {
  const ForgotPasswordScreen({super.key, required this.authService});

  final AuthService authService;

  @override
  State<ForgotPasswordScreen> createState() => _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends State<ForgotPasswordScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  bool _submitting = false;
  bool _sent = false;
  String? _errorMessage;

  @override
  void dispose() {
    _emailController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _submitting = true;
      _errorMessage = null;
    });
    try {
      await widget.authService.sendPasswordResetEmail(_emailController.text.trim());
      setState(() => _sent = true);
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
      appBar: AppBar(title: const Text('Reset password')),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(RaSpace.pageGutter),
          child: _sent ? _buildConfirmation() : _buildForm(),
        ),
      ),
    );
  }

  Widget _buildConfirmation() {
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        const Icon(Icons.mark_email_read, size: 48, color: RaColors.accent),
        const SizedBox(height: RaSpace.s4),
        Text(
          'If ${_emailController.text.trim()} has an account, a reset link is on its way.',
          textAlign: TextAlign.center,
          style: const TextStyle(color: RaColors.textSecondary),
        ),
      ],
    );
  }

  Widget _buildForm() {
    return Form(
      key: _formKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Text(
            "Enter your email and we'll send you a link to reset your password.",
            style: TextStyle(color: RaColors.textSecondary),
          ),
          const SizedBox(height: RaSpace.s4),
          TextFormField(
            controller: _emailController,
            keyboardType: TextInputType.emailAddress,
            autofillHints: const [AutofillHints.email],
            decoration: const InputDecoration(labelText: 'Email'),
            validator: (value) => (value == null || !value.contains('@')) ? 'Enter a valid email' : null,
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
                : const Text('Send reset link'),
          ),
        ],
      ),
    );
  }
}
