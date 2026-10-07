import 'package:supabase_flutter/supabase_flutter.dart';
import 'chat_models.dart';

// Assistant backing service — FAQ keyword matching (same "deliberately
// dumb" philosophy as routing_rules for freetext requests, see
// supabase/migrations/00000000000023_hotel_faqs.sql) plus the escalation
// path to a live chat_threads/chat_messages conversation with staff.
class ChatService {
  ChatService(this._client);

  final SupabaseClient _client;

  Future<List<HotelFaq>> fetchFaqs() async {
    final rows = await _client
        .from('hotel_faqs')
        .select('keyword, question, answer')
        .order('sort_order', ascending: true);
    return rows
        .map((r) => HotelFaq(keyword: r['keyword'] as String, question: r['question'] as String, answer: r['answer'] as String))
        .toList();
  }

  HotelFaq? matchFaq(List<HotelFaq> faqs, String text) {
    final haystack = text.toLowerCase();
    for (final faq in faqs) {
      if (haystack.contains(faq.keyword.toLowerCase())) return faq;
    }
    return null;
  }

  /// The most recent open thread for this guest, if any — reused across
  /// app opens so a conversation with staff survives a restart.
  Future<ChatThread?> fetchOpenThread() async {
    final row = await _client
        .from('chat_threads')
        .select('id, status')
        .eq('status', 'open')
        .order('created_at', ascending: false)
        .limit(1)
        .maybeSingle();
    if (row == null) return null;
    return ChatThread(id: row['id'] as String, status: row['status'] as String);
  }

  Future<ChatThread> createThread({
    required String hotelId,
    required String roomId,
    required String guestSessionId,
  }) async {
    final row = await _client
        .from('chat_threads')
        .insert({'hotel_id': hotelId, 'room_id': roomId, 'guest_session_id': guestSessionId})
        .select('id, status')
        .single();
    return ChatThread(id: row['id'] as String, status: row['status'] as String);
  }

  Future<List<ChatMessage>> fetchMessages(String threadId) async {
    final rows = await _client
        .from('chat_messages')
        .select('id, thread_id, sender_type, body, created_at')
        .eq('thread_id', threadId)
        // postgrest-dart's .order() defaults to descending (unlike
        // postgrest-js) — without ascending: true this renders newest-first.
        .order('created_at', ascending: true);
    return rows.map(_messageFromRow).toList();
  }

  Future<void> sendMessage({
    required String threadId,
    required String hotelId,
    required String guestSessionId,
    required String body,
  }) async {
    await _client.from('chat_messages').insert({
      'thread_id': threadId,
      'hotel_id': hotelId,
      'guest_session_id': guestSessionId,
      'sender_type': 'guest',
      'body': body,
    });
  }

  RealtimeChannel subscribeToMessages(String threadId, void Function(ChatMessage message) onInsert) {
    return _client
        .channel('chat-thread-$threadId')
        .onPostgresChanges(
          event: PostgresChangeEvent.insert,
          schema: 'public',
          table: 'chat_messages',
          filter: PostgresChangeFilter(type: PostgresChangeFilterType.eq, column: 'thread_id', value: threadId),
          callback: (payload) => onInsert(_messageFromRow(payload.newRecord)),
        )
        .subscribe();
  }

  ChatMessage _messageFromRow(Map<String, dynamic> row) {
    return ChatMessage(
      id: row['id'] as String,
      threadId: row['thread_id'] as String,
      senderType: row['sender_type'] as String,
      body: row['body'] as String,
      createdAt: DateTime.parse(row['created_at'] as String),
    );
  }
}
