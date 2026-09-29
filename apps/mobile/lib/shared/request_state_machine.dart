// Ported from packages/shared/src/request-state-machine.ts — keep in sync.
// The database (supabase/migrations/00000000000010_triggers.sql) is the
// actual enforcement; this copy just lets the UI grey out impossible
// actions and label the ✓✓●○ tracker.

enum RequestStatus { newStatus, accepted, inProgress, onTheWay, completed, cancelled }

enum RequestKind { service, freetext, order }

RequestStatus requestStatusFromString(String value) => switch (value) {
      'new' => RequestStatus.newStatus,
      'accepted' => RequestStatus.accepted,
      'in_progress' => RequestStatus.inProgress,
      'on_the_way' => RequestStatus.onTheWay,
      'completed' => RequestStatus.completed,
      'cancelled' => RequestStatus.cancelled,
      _ => throw ArgumentError('Unknown request status: $value'),
    };

RequestKind requestKindFromString(String value) => switch (value) {
      'service' => RequestKind.service,
      'freetext' => RequestKind.freetext,
      'order' => RequestKind.order,
      _ => throw ArgumentError('Unknown request kind: $value'),
    };

bool canGuestCancel(RequestStatus current) => current == RequestStatus.newStatus;

const _terminalStatuses = {RequestStatus.completed, RequestStatus.cancelled};
bool isTerminal(RequestStatus status) => _terminalStatuses.contains(status);

const _statusLabels = <RequestKind, Map<RequestStatus, String>>{
  RequestKind.service: {
    RequestStatus.newStatus: 'Request Received',
    RequestStatus.accepted: 'Accepted',
    RequestStatus.inProgress: 'In Progress',
    RequestStatus.onTheWay: 'On the Way',
    RequestStatus.completed: 'Completed',
    RequestStatus.cancelled: 'Cancelled',
  },
  RequestKind.freetext: {
    RequestStatus.newStatus: 'Request Received',
    RequestStatus.accepted: 'Accepted',
    RequestStatus.inProgress: 'In Progress',
    RequestStatus.onTheWay: 'On the Way',
    RequestStatus.completed: 'Completed',
    RequestStatus.cancelled: 'Cancelled',
  },
  RequestKind.order: {
    RequestStatus.newStatus: 'Order Received',
    RequestStatus.accepted: 'Confirmed',
    RequestStatus.inProgress: 'Preparing',
    RequestStatus.onTheWay: 'On the Way',
    RequestStatus.completed: 'Delivered',
    RequestStatus.cancelled: 'Cancelled',
  },
};

String statusLabel(RequestKind kind, RequestStatus status) => _statusLabels[kind]![status]!;

const trackerSteps = [
  RequestStatus.newStatus,
  RequestStatus.accepted,
  RequestStatus.onTheWay,
  RequestStatus.completed,
];

enum TrackerStepState { done, active, pending }

TrackerStepState trackerStepState(RequestStatus current, RequestStatus step) {
  if (current == RequestStatus.cancelled) return TrackerStepState.pending;
  var currentIndex = trackerSteps.indexOf(current);
  final stepIndex = trackerSteps.indexOf(step);
  // in_progress renders on the same tracker slot as "accepted" until the
  // guest actually sees movement (on_the_way).
  if (currentIndex == -1) currentIndex = trackerSteps.indexOf(RequestStatus.accepted);
  if (stepIndex < currentIndex) return TrackerStepState.done;
  if (stepIndex == currentIndex) return TrackerStepState.active;
  return TrackerStepState.pending;
}
