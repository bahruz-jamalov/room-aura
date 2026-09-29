// Smoke test for the app theme. FoundationScreen itself calls
// Supabase.instance.client, which needs Supabase.initialize() (done in
// main()) — exercising it here would mean faking network calls, which isn't
// worth it for this Phase N1 placeholder screen.
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:room_aura_mobile/theme/app_theme.dart';

void main() {
  testWidgets('applies the ROOM-AURA theme', (WidgetTester tester) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: const Scaffold(body: Text('ROOM-AURA')),
      ),
    );

    expect(find.text('ROOM-AURA'), findsOneWidget);
  });
}
