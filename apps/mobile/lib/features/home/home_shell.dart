import 'package:flutter/material.dart';
import '../auth/account_screen.dart';
import '../auth/auth_service.dart';
import '../chat/chat_screen.dart';
import '../connect/hotel_session.dart';
import '../hotel/hotel_info_screen.dart';
import '../requests/my_requests_screen.dart';
import 'home_screen.dart';

// The signed-in, connected app shell — bottom nav host for Phase N4's guest
// flows. HotelSession/Cart are provided at the app root (app/app.dart), not
// here, so pushed screens (service detail, menu, cart) can read them too.
class HomeShell extends StatefulWidget {
  const HomeShell({super.key, required this.authService, required this.hotelSession});

  final AuthService authService;
  final HotelSession hotelSession;

  @override
  State<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends State<HomeShell> {
  int _tabIndex = 0;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: IndexedStack(
        index: _tabIndex,
        children: [
          HomeScreen(hotelSession: widget.hotelSession),
          const MyRequestsScreen(),
          HotelInfoScreen(hotelSession: widget.hotelSession),
          AccountScreen(authService: widget.authService),
        ],
      ),
      // A raised, centered chat button "docked" over the nav bar — Material
      // 3's NavigationBar has no built-in notch (unlike the older
      // BottomAppBar), so this overlaps it with a Stack instead.
      bottomNavigationBar: SizedBox(
        height: 92,
        child: Stack(
          clipBehavior: Clip.none,
          alignment: Alignment.topCenter,
          children: [
            Positioned.fill(
              top: 24,
              child: NavigationBar(
                selectedIndex: _tabIndex,
                onDestinationSelected: (index) => setState(() => _tabIndex = index),
                destinations: const [
                  NavigationDestination(icon: Icon(Icons.home_outlined), selectedIcon: Icon(Icons.home), label: 'Home'),
                  NavigationDestination(
                    icon: Icon(Icons.receipt_long_outlined),
                    selectedIcon: Icon(Icons.receipt_long),
                    label: 'Requests',
                  ),
                  NavigationDestination(
                    icon: Icon(Icons.apartment_outlined),
                    selectedIcon: Icon(Icons.apartment),
                    label: 'Hotel',
                  ),
                  NavigationDestination(
                    icon: Icon(Icons.person_outline),
                    selectedIcon: Icon(Icons.person),
                    label: 'Account',
                  ),
                ],
              ),
            ),
            Positioned(
              top: 0,
              child: FloatingActionButton(
                heroTag: 'chat-fab',
                onPressed: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const ChatScreen())),
                child: const Icon(Icons.chat_bubble_outline),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
