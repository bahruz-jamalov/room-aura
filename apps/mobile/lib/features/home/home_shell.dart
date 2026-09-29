import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../auth/account_screen.dart';
import '../auth/auth_service.dart';
import '../cart/cart.dart';
import '../connect/hotel_session.dart';
import '../requests/my_requests_screen.dart';
import 'home_screen.dart';

// The signed-in, connected app shell — bottom nav host for Phase N4's guest
// flows. HotelSession and Cart are provided here so any pushed screen below
// (service detail, menu, cart, requests) can read them via Provider.
class HomeShell extends StatefulWidget {
  const HomeShell({super.key, required this.authService, required this.hotelSession});

  final AuthService authService;
  final HotelSession hotelSession;

  @override
  State<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends State<HomeShell> {
  final _cart = Cart();
  int _tabIndex = 0;

  @override
  void dispose() {
    _cart.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        Provider<HotelSession>.value(value: widget.hotelSession),
        ChangeNotifierProvider<Cart>.value(value: _cart),
      ],
      child: Scaffold(
        body: IndexedStack(
          index: _tabIndex,
          children: [
            HomeScreen(hotelSession: widget.hotelSession),
            const MyRequestsScreen(),
            AccountScreen(authService: widget.authService),
          ],
        ),
        bottomNavigationBar: NavigationBar(
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
              icon: Icon(Icons.person_outline),
              selectedIcon: Icon(Icons.person),
              label: 'Account',
            ),
          ],
        ),
      ),
    );
  }
}
