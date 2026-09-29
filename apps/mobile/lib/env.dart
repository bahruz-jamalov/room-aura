import 'package:flutter_dotenv/flutter_dotenv.dart';

class Env {
  static String get supabaseUrl => _require('SUPABASE_URL');
  static String get supabasePublishableKey => _require('SUPABASE_PUBLISHABLE_KEY');

  // Optional: unset until Google Cloud / Apple Developer accounts exist
  // (see the Native App Blueprint's setup checklist). Sign-in buttons for
  // these providers detect the missing value and explain why, rather than
  // crashing the whole app over a feature that isn't configured yet.
  static String? get googleServerClientId => _optional('GOOGLE_SERVER_CLIENT_ID');
  static String? get googleIosClientId => _optional('GOOGLE_IOS_CLIENT_ID');

  static String? _optional(String key) {
    final value = dotenv.env[key];
    return (value == null || value.isEmpty) ? null : value;
  }

  static String _require(String key) {
    final value = dotenv.env[key];
    if (value == null || value.isEmpty) {
      throw StateError(
        'Missing $key. Copy apps/mobile/.env.example to apps/mobile/.env and fill in the values from Project Settings → API Keys.',
      );
    }
    return value;
  }
}
