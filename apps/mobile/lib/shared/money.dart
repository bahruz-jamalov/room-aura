import 'package:intl/intl.dart';

// Mirrors packages/shared/src/money.ts — keep in sync.
String formatMoney(int minor, String currency, {String locale = 'en'}) {
  return NumberFormat.currency(locale: locale, name: currency).format(minor / 100);
}
