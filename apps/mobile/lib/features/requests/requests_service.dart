import 'package:supabase_flutter/supabase_flutter.dart';
import '../../shared/request_state_machine.dart';
import '../../shared/resolve_translation.dart';
import 'request_models.dart';

// Mirrors apps/tourist/src/hooks/{useMyRequests,useRequestDetail}.ts and the
// direct requests.insert() calls in ServiceDetailScreen.tsx /
// RequestDetailScreen.tsx (cancel).
class RequestsService {
  RequestsService(this._client);

  final SupabaseClient _client;

  Future<String> createServiceRequest({
    required String hotelId,
    required String roomId,
    required String guestSessionId,
    required String serviceId,
    required String departmentId,
    required int quantity,
    String? guestNote,
  }) async {
    final row = await _client
        .from('requests')
        .insert({
          'hotel_id': hotelId,
          'room_id': roomId,
          'guest_session_id': guestSessionId,
          'kind': 'service',
          'service_id': serviceId,
          'department_id': departmentId,
          'quantity': quantity,
          'guest_note': guestNote,
        })
        .select('id')
        .single();
    return row['id'] as String;
  }

  Future<void> cancelRequest(String requestId) async {
    await _client.from('requests').update({'status': 'cancelled'}).eq('id', requestId);
  }

  Future<List<RequestSummary>> fetchMyRequests({
    required String locale,
    required String fallbackLocale,
  }) async {
    final rows = await _client
        .from('requests')
        .select('id, number, kind, status, created_at, original_text, service_id')
        .order('created_at', ascending: false);

    final serviceIds = {
      for (final r in rows)
        if (r['service_id'] != null) r['service_id'] as String,
    }.toList();
    final orderIds = [
      for (final r in rows)
        if (r['kind'] == 'order') r['id'] as String,
    ];

    var serviceTranslations = <Map<String, dynamic>>[];
    if (serviceIds.isNotEmpty) {
      serviceTranslations = await _client
          .from('service_translations')
          .select('service_id, locale, name')
          .inFilter('service_id', serviceIds);
    }

    var orderItems = <Map<String, dynamic>>[];
    if (orderIds.isNotEmpty) {
      orderItems = await _client.from('order_items').select('order_id, name_snapshot').inFilter('order_id', orderIds);
    }

    return rows.map((r) {
      final kind = requestKindFromString(r['kind'] as String);
      String displayText = 'Request';
      final originalText = r['original_text'] as String?;
      final serviceId = r['service_id'] as String?;

      if (kind == RequestKind.freetext && originalText != null) {
        displayText = originalText.length > 48 ? '${originalText.substring(0, 48)}…' : originalText;
      } else if (kind == RequestKind.service && serviceId != null) {
        final matches = serviceTranslations.where((t) => t['service_id'] == serviceId).toList();
        final resolved = resolveTranslation(matches, (t) => t['locale'] as String, locale, fallbackLocale);
        displayText = resolved?['name'] as String? ?? 'Service request';
      } else if (kind == RequestKind.order) {
        final names = orderItems.where((oi) => oi['order_id'] == r['id']).map((oi) => oi['name_snapshot'] as String).toList();
        displayText = names.isEmpty
            ? 'Order'
            : names.length == 1
                ? names.first
                : '${names.first} +${names.length - 1} more';
      }

      return RequestSummary(
        id: r['id'] as String,
        number: r['number'] as String,
        kind: kind,
        status: requestStatusFromString(r['status'] as String),
        createdAt: DateTime.parse(r['created_at'] as String),
        displayText: displayText,
      );
    }).toList();
  }

  /// Refires on any change to this guest's requests — the payload shape
  /// varies per event, so (like the web app) we just tell the caller to
  /// refetch rather than try to patch state from it.
  RealtimeChannel subscribeToMyRequests(String guestSessionId, void Function() onChange) {
    return _client
        .channel('my-requests-$guestSessionId')
        .onPostgresChanges(
          event: PostgresChangeEvent.all,
          schema: 'public',
          table: 'requests',
          filter: PostgresChangeFilter(type: PostgresChangeFilterType.eq, column: 'guest_session_id', value: guestSessionId),
          callback: (payload) => onChange(),
        )
        .subscribe();
  }

  Future<RequestDetail?> fetchRequestDetail(String requestId) async {
    final row = await _client
        .from('requests')
        .select(
          'id, number, kind, status, quantity, guest_note, original_text, estimated_minutes, created_at',
        )
        .eq('id', requestId)
        .maybeSingle();
    if (row == null) return null;
    return _detailFromRow(row);
  }

  RealtimeChannel subscribeToRequestDetail(String requestId, void Function(RequestDetail detail) onUpdate) {
    return _client
        .channel('request-$requestId')
        .onPostgresChanges(
          event: PostgresChangeEvent.update,
          schema: 'public',
          table: 'requests',
          filter: PostgresChangeFilter(type: PostgresChangeFilterType.eq, column: 'id', value: requestId),
          callback: (payload) => onUpdate(_detailFromRow(payload.newRecord)),
        )
        .subscribe();
  }

  RequestDetail _detailFromRow(Map<String, dynamic> row) {
    return RequestDetail(
      id: row['id'] as String,
      number: row['number'] as String,
      kind: requestKindFromString(row['kind'] as String),
      status: requestStatusFromString(row['status'] as String),
      quantity: row['quantity'] as int?,
      guestNote: row['guest_note'] as String?,
      originalText: row['original_text'] as String?,
      estimatedMinutes: row['estimated_minutes'] as int?,
      createdAt: DateTime.parse(row['created_at'] as String),
    );
  }
}
