import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../auth/auth_service.dart';
import '../home/home_shell.dart';
import 'connect_screen.dart';
import 'hotel_session.dart';
import 'hotel_session_holder.dart';
import 'hotel_session_service.dart';

/// Shown once signed in. Checks whether this account already redeemed a
/// room (persists across app restarts, unlike the old anonymous-guest
/// model — see redeem-access's guest_sessions upsert on auth_user_id) and
/// skips straight to Home if so; otherwise sends the guest to scan/enter
/// their room code first.
class SessionGate extends StatefulWidget {
  const SessionGate({super.key, required this.authService});

  final AuthService authService;

  @override
  State<SessionGate> createState() => _SessionGateState();
}

class _SessionGateState extends State<SessionGate> {
  late final _hotelSessionService = HotelSessionService(Supabase.instance.client);
  bool _loading = true;
  bool _hasError = false;

  @override
  void initState() {
    super.initState();
    _checkForExistingSession();
  }

  Future<void> _checkForExistingSession() async {
    setState(() {
      _loading = true;
      _hasError = false;
    });
    try {
      final session = await _hotelSessionService.fetchActiveSession();
      if (!mounted) return;
      context.read<HotelSessionHolder>().session = session;
      setState(() => _loading = false);
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _hasError = true;
      });
    }
  }

  void _onConnected(HotelSession session) {
    context.read<HotelSessionHolder>().session = session;
    Navigator.of(context).popUntil((route) => route.isFirst);
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }
    if (_hasError) {
      return Scaffold(
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Text("Something went wrong loading your session."),
                const SizedBox(height: 16),
                FilledButton(onPressed: _checkForExistingSession, child: const Text("Try again")),
                TextButton(onPressed: () => widget.authService.signOut(), child: const Text("Sign out")),
              ],
            ),
          ),
        ),
      );
    }
    final session = context.watch<HotelSessionHolder>().session;
    if (session == null) {
      return ConnectScreen(hotelSessionService: _hotelSessionService, onConnected: _onConnected);
    }
    return HomeShell(authService: widget.authService, hotelSession: session);
  }
}
