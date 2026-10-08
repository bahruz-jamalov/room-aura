import 'package:flutter_test/flutter_test.dart';
import 'package:room_aura_mobile/shared/request_state_machine.dart';

void main() {
  group('requestStatusFromString / requestKindFromString', () {
    test('parses every known value', () {
      expect(requestStatusFromString('new'), RequestStatus.newStatus);
      expect(requestStatusFromString('completed'), RequestStatus.completed);
      expect(requestKindFromString('order'), RequestKind.order);
    });

    test('throws on an unknown value', () {
      expect(() => requestStatusFromString('bogus'), throwsArgumentError);
      expect(() => requestKindFromString('bogus'), throwsArgumentError);
    });
  });

  group('canGuestCancel', () {
    test('only allows cancelling from newStatus', () {
      expect(canGuestCancel(RequestStatus.newStatus), isTrue);
      expect(canGuestCancel(RequestStatus.accepted), isFalse);
      expect(canGuestCancel(RequestStatus.completed), isFalse);
    });
  });

  group('isTerminal', () {
    test('flags completed and cancelled, nothing else', () {
      expect(isTerminal(RequestStatus.completed), isTrue);
      expect(isTerminal(RequestStatus.cancelled), isTrue);
      expect(isTerminal(RequestStatus.onTheWay), isFalse);
    });
  });

  group('statusLabel', () {
    test('uses order-specific wording for order kind', () {
      expect(statusLabel(RequestKind.order, RequestStatus.newStatus), 'Order Received');
      expect(statusLabel(RequestKind.order, RequestStatus.completed), 'Delivered');
    });

    test('uses the shared wording for service and freetext kinds', () {
      expect(statusLabel(RequestKind.service, RequestStatus.newStatus), 'Request Received');
      expect(statusLabel(RequestKind.freetext, RequestStatus.completed), 'Completed');
    });
  });

  group('trackerStepState', () {
    test('marks earlier steps done, the current step active, later steps pending', () {
      expect(trackerStepState(RequestStatus.accepted, RequestStatus.newStatus), TrackerStepState.done);
      expect(trackerStepState(RequestStatus.accepted, RequestStatus.accepted), TrackerStepState.active);
      expect(trackerStepState(RequestStatus.accepted, RequestStatus.onTheWay), TrackerStepState.pending);
    });

    test('renders inProgress on the same slot as accepted', () {
      expect(trackerStepState(RequestStatus.inProgress, RequestStatus.accepted), TrackerStepState.active);
      expect(trackerStepState(RequestStatus.inProgress, RequestStatus.newStatus), TrackerStepState.done);
    });

    test('marks every step pending once cancelled', () {
      expect(trackerStepState(RequestStatus.cancelled, RequestStatus.newStatus), TrackerStepState.pending);
      expect(trackerStepState(RequestStatus.cancelled, RequestStatus.completed), TrackerStepState.pending);
    });
  });
}
