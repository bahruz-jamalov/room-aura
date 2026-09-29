import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../theme/app_theme.dart';
import '../features/auth/auth_service.dart';
import '../features/auth/sign_in_screen.dart';
import '../features/cart/cart.dart';
import '../features/connect/hotel_session_holder.dart';
import '../features/connect/session_gate.dart';

class RoomAuraApp extends StatelessWidget {
  const RoomAuraApp({super.key});

  @override
  Widget build(BuildContext context) {
    // Provided here, above MaterialApp/Navigator, so every pushed route —
    // not just the first one — can read them (see HotelSessionHolder's doc).
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => Cart()),
        ChangeNotifierProvider(create: (_) => HotelSessionHolder()),
      ],
      child: MaterialApp(
        title: 'ROOM-AURA',
        debugShowCheckedModeBanner: false,
        theme: AppTheme.light,
        home: AuthGate(authService: AuthService(Supabase.instance.client)),
      ),
    );
  }
}

/// Switches between the sign-in flow and the signed-in app based on the
/// live Supabase auth session — every screen this rebuilds into re-reads
/// authService.currentUser fresh, so sign-in/out/delete all just work.
class AuthGate extends StatelessWidget {
  const AuthGate({super.key, required this.authService});

  final AuthService authService;

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<AuthState>(
      stream: authService.onAuthStateChange,
      builder: (context, snapshot) {
        final signedIn = authService.currentUser != null;
        return signedIn ? SessionGate(authService: authService) : SignInScreen(authService: authService);
      },
    );
  }
}
