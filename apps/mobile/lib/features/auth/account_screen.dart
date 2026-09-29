import 'package:flutter/material.dart';
import '../../theme/tokens.dart';
import 'auth_service.dart';

class AccountScreen extends StatefulWidget {
  const AccountScreen({super.key, required this.authService});

  final AuthService authService;

  @override
  State<AccountScreen> createState() => _AccountScreenState();
}

class _AccountScreenState extends State<AccountScreen> {
  bool _deleting = false;
  String? _errorMessage;

  Future<void> _confirmAndDeleteAccount() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete your account?'),
        content: const Text(
          'This permanently deletes your ROOM-AURA account and any hotel session tied to it. This cannot be undone.',
        ),
        actions: [
          TextButton(onPressed: () => Navigator.of(context).pop(false), child: const Text('Cancel')),
          TextButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('Delete', style: TextStyle(color: RaColors.danger)),
          ),
        ],
      ),
    );
    if (confirmed != true) return;

    setState(() {
      _deleting = true;
      _errorMessage = null;
    });
    try {
      await widget.authService.deleteAccount();
      // AuthGate rebuilds the root route to SignInScreen once the session
      // clears, but this screen was pushed on top of it — without popping,
      // the (now pointless) Account screen would stay on top of that.
      if (mounted) Navigator.of(context).popUntil((route) => route.isFirst);
    } catch (e) {
      setState(() {
        _deleting = false;
        _errorMessage = 'Could not delete your account. Please try again.';
      });
    }
  }

  Future<void> _signOut(BuildContext context) async {
    await widget.authService.signOut();
    if (context.mounted) Navigator.of(context).popUntil((route) => route.isFirst);
  }

  @override
  Widget build(BuildContext context) {
    final user = widget.authService.currentUser;
    final fullName = user?.userMetadata?['full_name'] as String?;

    return Scaffold(
      appBar: AppBar(title: const Text('Account')),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(RaSpace.pageGutter),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Container(
                padding: const EdgeInsets.all(RaSpace.s5),
                decoration: BoxDecoration(
                  color: RaColors.surface,
                  borderRadius: BorderRadius.circular(RaRadius.card),
                  border: Border.all(color: RaColors.border),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (fullName != null && fullName.isNotEmpty) ...[
                      Text(fullName, style: const TextStyle(fontSize: RaText.lg, fontWeight: FontWeight.w600)),
                      const SizedBox(height: RaSpace.s1),
                    ],
                    Text(user?.email ?? '', style: const TextStyle(color: RaColors.textSecondary)),
                  ],
                ),
              ),
              const SizedBox(height: RaSpace.s6),
              OutlinedButton(
                onPressed: () => _signOut(context),
                style: OutlinedButton.styleFrom(minimumSize: const Size.fromHeight(RaSize.touchTarget)),
                child: const Text('Sign out'),
              ),
              const Spacer(),
              if (_errorMessage != null) ...[
                Text(_errorMessage!, style: const TextStyle(color: RaColors.danger), textAlign: TextAlign.center),
                const SizedBox(height: RaSpace.s3),
              ],
              TextButton(
                onPressed: _deleting ? null : _confirmAndDeleteAccount,
                style: TextButton.styleFrom(foregroundColor: RaColors.danger),
                child: _deleting
                    ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2))
                    : const Text('Delete account'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
