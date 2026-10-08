import 'package:supabase_flutter/supabase_flutter.dart';
import 'notification_models.dart';

// Mirrors requests_service.dart's shape: RLS already scopes every select/
// update to the caller's own guest_session_id (00000000000009_rls_policies.
// sql), so fetch/markAsRead don't filter by it themselves — only the
// realtime subscription needs it, to pick the right postgres_changes filter.
class NotificationsService {
  NotificationsService(this._client);

  final SupabaseClient _client;

  Future<List<GuestNotification>> fetchMyNotifications() async {
    final rows = await _client
        .from('notifications')
        .select('id, type_key, params, request_id, created_at, read_at')
        .order('created_at', ascending: false);
    return rows.map(_fromRow).toList();
  }

  Future<int> fetchUnreadCount() async {
    final rows = await _client.from('notifications').select('id').filter('read_at', 'is', null);
    return rows.length;
  }

  Future<void> markAsRead(String id) async {
    await _client.from('notifications').update({'read_at': DateTime.now().toIso8601String()}).eq('id', id);
  }

  RealtimeChannel subscribeToMyNotifications(
    String guestSessionId,
    void Function(GuestNotification notification) onInsert,
  ) {
    return _client
        .channel('my-notifications-$guestSessionId')
        .onPostgresChanges(
          event: PostgresChangeEvent.insert,
          schema: 'public',
          table: 'notifications',
          filter: PostgresChangeFilter(type: PostgresChangeFilterType.eq, column: 'guest_session_id', value: guestSessionId),
          callback: (payload) => onInsert(_fromRow(payload.newRecord)),
        )
        .subscribe();
  }

  GuestNotification _fromRow(Map<String, dynamic> row) {
    return GuestNotification(
      id: row['id'] as String,
      typeKey: row['type_key'] as String,
      params: Map<String, dynamic>.from(row['params'] as Map),
      requestId: row['request_id'] as String?,
      createdAt: DateTime.parse(row['created_at'] as String),
      readAt: row['read_at'] == null ? null : DateTime.parse(row['read_at'] as String),
    );
  }
}
