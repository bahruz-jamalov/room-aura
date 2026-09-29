import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../theme/tokens.dart';
import 'auth_service.dart';
import 'forgot_password_screen.dart';
import 'sign_up_screen.dart';

class SignInScreen extends StatefulWidget {
  const SignInScreen({super.key, required this.authService});

  final AuthService authService;

  @override
  State<SignInScreen> createState() => _SignInScreenState();
}

class _SignInScreenState extends State<SignInScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _submitting = false;
  String? _errorMessage;

  Future<void> _runSocialSignIn(Future<void> Function() action) async {
    setState(() {
      _submitting = true;
      _errorMessage = null;
    });
    try {
      await action();
    } on ProviderNotConfiguredException catch (e) {
      setState(() => _errorMessage = e.message);
    } on AuthException catch (e) {
      setState(() => _errorMessage = e.message);
    } catch (e) {
      setState(() => _errorMessage = 'Sign-in was cancelled or failed.');
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  void dispose() {
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
      await widget.authService.signIn(
        email: _emailController.text.trim(),
        password: _passwordController.text,
      );
      // Navigation happens automatically via the auth-state listener in app.dart.
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
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(RaSpace.pageGutter),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const SizedBox(height: RaSpace.s12),
                const Text(
                  'ROOM-AURA',
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: RaText.xxxl, fontWeight: FontWeight.w700, color: RaColors.textPrimary),
                ),
                const SizedBox(height: RaSpace.s2),
                const Text(
                  'Sign in to continue',
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: RaText.base, color: RaColors.textSecondary),
                ),
                const SizedBox(height: RaSpace.s10),
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
                  autofillHints: const [AutofillHints.password],
                  decoration: const InputDecoration(labelText: 'Password'),
                  validator: (value) => (value == null || value.isEmpty) ? 'Enter your password' : null,
                ),
                const SizedBox(height: RaSpace.s2),
                Align(
                  alignment: Alignment.centerRight,
                  child: TextButton(
                    onPressed: _submitting
                        ? null
                        : () => Navigator.of(context).push(
                              MaterialPageRoute(builder: (_) => ForgotPasswordScreen(authService: widget.authService)),
                            ),
                    child: const Text('Forgot password?'),
                  ),
                ),
                if (_errorMessage != null) ...[
                  const SizedBox(height: RaSpace.s2),
                  Text(_errorMessage!, style: const TextStyle(color: RaColors.danger), textAlign: TextAlign.center),
                ],
                const SizedBox(height: RaSpace.s4),
                ElevatedButton(
                  onPressed: _submitting ? null : _submit,
                  child: _submitting
                      ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2))
                      : const Text('Sign in'),
                ),
                const SizedBox(height: RaSpace.s6),
                Row(
                  children: [
                    const Expanded(child: Divider(color: RaColors.border)),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: RaSpace.s3),
                      child: Text('or', style: TextStyle(color: RaColors.textSecondary, fontSize: RaText.sm)),
                    ),
                    const Expanded(child: Divider(color: RaColors.border)),
                  ],
                ),
                const SizedBox(height: RaSpace.s4),
                OutlinedButton.icon(
                  onPressed: _submitting ? null : () => _runSocialSignIn(widget.authService.signInWithGoogle),
                  icon: const Icon(Icons.g_mobiledata, size: 28),
                  label: const Text('Continue with Google'),
                  style: OutlinedButton.styleFrom(
                    minimumSize: const Size.fromHeight(RaSize.touchTarget),
                    side: const BorderSide(color: RaColors.border),
                    foregroundColor: RaColors.textPrimary,
                  ),
                ),
                const SizedBox(height: RaSpace.s3),
                OutlinedButton.icon(
                  onPressed: _submitting ? null : () => _runSocialSignIn(widget.authService.signInWithApple),
                  icon: const Icon(Icons.apple, size: 22),
                  label: const Text('Continue with Apple'),
                  style: OutlinedButton.styleFrom(
                    minimumSize: const Size.fromHeight(RaSize.touchTarget),
                    side: const BorderSide(color: RaColors.border),
                    foregroundColor: RaColors.textPrimary,
                  ),
                ),
                const SizedBox(height: RaSpace.s6),
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Text("Don't have an account?", style: TextStyle(color: RaColors.textSecondary)),
                    TextButton(
                      onPressed: _submitting
                          ? null
                          : () => Navigator.of(context).push(
                                MaterialPageRoute(builder: (_) => SignUpScreen(authService: widget.authService)),
                              ),
                      child: const Text('Sign up'),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
