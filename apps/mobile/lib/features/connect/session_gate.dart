import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../auth/auth_service.dart';
import '../home/home_shell.dart';
import 'connect_screen.dart';
import 'hotel_session.dart';
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
  HotelSession? _session;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _checkForExistingSession();
  }

  Future<void> _checkForExistingSession() async {
    final session = await _hotelSessionService.fetchActiveSession();
    if (!mounted) return;
    setState(() {
      _session = session;
      _loading = false;
    });
  }

  void _onConnected(HotelSession session) {
    setState(() => _session = session);
    Navigator.of(context).popUntil((route) => route.isFirst);
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }
    if (_session == null) {
      return ConnectScreen(hotelSessionService: _hotelSessionService, onConnected: _onConnected);
    }
    return HomeShell(authService: widget.authService, hotelSession: _session!);
  }
}
