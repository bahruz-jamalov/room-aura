import 'package:supabase_flutter/supabase_flutter.dart';

class TranslateResult {
  const TranslateResult({required this.text, required this.provider, required this.isMock});
  final String text;
  final String provider;
  final bool isMock;
}

// Mirrors apps/tourist/src/lib/{translate,departmentRouter}.ts and
// OtherRequestScreen.tsx's requests.insert() for kind='freetext'.
class FreetextService {
  FreetextService(this._client);

  final SupabaseClient _client;

  /// Translation failing must never block the request reaching the hotel —
  /// falls back to the original text, same as the web app.
  Future<TranslateResult> translateContent({
    required String text,
    required String sourceLocale,
    required String targetLocale,
  }) async {
    try {
      final response = await _client.functions.invoke(
        'translate-content',
        body: {'text': text, 'sourceLocale': sourceLocale, 'targetLocale': targetLocale},
      );
      final data = response.data as Map<String, dynamic>;
      return TranslateResult(
        text: data['text'] as String,
        provider: data['provider'] as String,
        isMock: data['isMock'] as bool,
      );
    } catch (_) {
      return TranslateResult(text: text, provider: 'none', isMock: true);
    }
  }

  /// Deliberately dumb keyword match on the TRANSLATED text against the
  /// hotel's routing_rules (highest priority wins), falling back to
  /// hotel_settings.freetext_department_id.
  Future<String?> resolveFreetextDepartment(String translatedText) async {
    final rules = await _client.from('routing_rules').select('keyword, department_id, priority').order('priority', ascending: false);
    final haystack = translatedText.toLowerCase();
    for (final rule in rules) {
      if (haystack.contains((rule['keyword'] as String).toLowerCase())) {
        return rule['department_id'] as String;
      }
    }
    final settings = await _client.from('hotel_settings').select('freetext_department_id').maybeSingle();
    return settings?['freetext_department_id'] as String?;
  }

  Future<String> createFreetextRequest({
    required String hotelId,
    required String roomId,
    required String guestSessionId,
    required String departmentId,
    required String originalText,
    required String originalLocale,
    required TranslateResult translated,
  }) async {
    final row = await _client
        .from('requests')
        .insert({
          'hotel_id': hotelId,
          'room_id': roomId,
          'guest_session_id': guestSessionId,
          'kind': 'freetext',
          'department_id': departmentId,
          'original_text': originalText,
          'original_locale': originalLocale,
          'translated_text': translated.text,
          'translation_provider': translated.provider,
          'translation_is_mock': translated.isMock,
        })
        .select('id')
        .single();
    return row['id'] as String;
  }
}
