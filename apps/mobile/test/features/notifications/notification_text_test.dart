import 'package:flutter_test/flutter_test.dart';
import 'package:room_aura_mobile/features/notifications/notification_models.dart';
import 'package:room_aura_mobile/features/notifications/notification_text.dart';

GuestNotification _notification({required String typeKey, required Map<String, dynamic> params}) {
  return GuestNotification(
    id: 'n1',
    typeKey: typeKey,
    params: params,
    requestId: 'r1',
    createdAt: DateTime(2026, 1, 1),
    readAt: null,
  );
}

void main() {
  test('gives order-completed its own actionable wording', () {
    final notification = _notification(
      typeKey: 'request.status_changed',
      params: {'status': 'completed', 'kind': 'order', 'requestNumber': 'RA-1018'},
    );
    expect(notificationMessage(notification), 'Your order #RA-1018 is ready — you can collect it now.');
  });

  test('falls back to the plain status label for other statuses', () {
    final notification = _notification(
      typeKey: 'request.status_changed',
      params: {'status': 'accepted', 'kind': 'order', 'requestNumber': 'RA-1018'},
    );
    expect(notificationMessage(notification), 'Request #RA-1018: Confirmed');
  });

  test('falls back to the plain status label for non-order kinds, even when completed', () {
    final notification = _notification(
      typeKey: 'request.status_changed',
      params: {'status': 'completed', 'kind': 'service', 'requestNumber': 'RA-1016'},
    );
    expect(notificationMessage(notification), 'Request #RA-1016: Completed');
  });

  test('gives unknown type_keys a generic message rather than throwing', () {
    final notification = _notification(typeKey: 'something.new', params: {});
    expect(notificationMessage(notification), 'You have a new update.');
  });
}
