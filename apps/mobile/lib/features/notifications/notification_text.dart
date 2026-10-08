import '../../shared/request_state_machine.dart';
import 'notification_models.dart';

/// Renders a GuestNotification's type_key + params into guest-facing text.
/// The order/delivered case gets its own wording (actionable — "go collect
/// it") rather than reusing the tracker's plain status label.
String notificationMessage(GuestNotification notification) {
  switch (notification.typeKey) {
    case 'request.status_changed':
      final kind = requestKindFromString(notification.params['kind'] as String);
      final status = requestStatusFromString(notification.params['status'] as String);
      final number = notification.params['requestNumber'] as String? ?? '';
      if (kind == RequestKind.order && status == RequestStatus.completed) {
        return 'Your order #$number is ready — you can collect it now.';
      }
      return 'Request #$number: ${statusLabel(kind, status)}';
    default:
      return 'You have a new update.';
  }
}
