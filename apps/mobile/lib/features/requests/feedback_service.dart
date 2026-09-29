import 'package:supabase_flutter/supabase_flutter.dart';

class ExistingFeedback {
  const ExistingFeedback({required this.rating, required this.effortScore, required this.comment});
  final int rating;
  final int effortScore;
  final String? comment;
}

// Mirrors apps/tourist/src/hooks/useFeedback.ts and FeedbackScreen.tsx.
class FeedbackService {
  FeedbackService(this._client);

  final SupabaseClient _client;

  Future<ExistingFeedback?> fetchFeedback(String requestId) async {
    final row = await _client.from('feedback').select('rating, effort_score, comment').eq('request_id', requestId).maybeSingle();
    if (row == null) return null;
    return ExistingFeedback(rating: row['rating'] as int, effortScore: row['effort_score'] as int, comment: row['comment'] as String?);
  }

  Future<void> submitFeedback({
    required String requestId,
    required String hotelId,
    required String guestSessionId,
    required int rating,
    required int effortScore,
    String? comment,
  }) async {
    await _client.from('feedback').insert({
      'request_id': requestId,
      'hotel_id': hotelId,
      'guest_session_id': guestSessionId,
      'rating': rating,
      'effort_score': effortScore,
      'comment': comment,
      'locale': 'en',
    });
  }
}
