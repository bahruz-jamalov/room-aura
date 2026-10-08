// Mirrors the `notifications` table (00000000000007_operations.sql): rows
// store a type_key + params rather than a rendered sentence so new locales
// need no backend change — see notification_text.dart for the renderer.
class GuestNotification {
  const GuestNotification({
    required this.id,
    required this.typeKey,
    required this.params,
    required this.requestId,
    required this.createdAt,
    required this.readAt,
  });

  final String id;
  final String typeKey;
  final Map<String, dynamic> params;
  final String? requestId;
  final DateTime createdAt;
  final DateTime? readAt;

  bool get isRead => readAt != null;

  GuestNotification copyWithReadAt(DateTime value) => GuestNotification(
        id: id,
        typeKey: typeKey,
        params: params,
        requestId: requestId,
        createdAt: createdAt,
        readAt: value,
      );
}
