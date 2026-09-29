import 'package:flutter/foundation.dart';
import 'hotel_session.dart';

/// Holds the connected guest's [HotelSession], provided once at the app
/// root (see app/app.dart) — not deep in the tree — because a Provider
/// placed inside a pushed route's own subtree is invisible to sibling
/// routes pushed later via Navigator.push (they share the same Navigator,
/// but aren't descendants of each other's widget trees).
class HotelSessionHolder extends ChangeNotifier {
  HotelSession? _session;

  HotelSession? get session => _session;

  set session(HotelSession? value) {
    _session = value;
    notifyListeners();
  }
}
