import '../../shared/request_state_machine.dart';

class RequestSummary {
  const RequestSummary({
    required this.id,
    required this.number,
    required this.kind,
    required this.status,
    required this.createdAt,
    required this.displayText,
  });

  final String id;
  final String number;
  final RequestKind kind;
  final RequestStatus status;
  final DateTime createdAt;
  final String displayText;
}

class RequestDetail {
  const RequestDetail({
    required this.id,
    required this.number,
    required this.kind,
    required this.status,
    required this.quantity,
    required this.guestNote,
    required this.originalText,
    required this.estimatedMinutes,
    required this.requestedFor,
    required this.createdAt,
  });

  final String id;
  final String number;
  final RequestKind kind;
  final RequestStatus status;
  final int? quantity;
  final String? guestNote;
  final String? originalText;
  final int? estimatedMinutes;
  final DateTime? requestedFor;
  final DateTime createdAt;

  RequestDetail copyWith({RequestStatus? status}) => RequestDetail(
        id: id,
        number: number,
        kind: kind,
        status: status ?? this.status,
        quantity: quantity,
        guestNote: guestNote,
        originalText: originalText,
        estimatedMinutes: estimatedMinutes,
        requestedFor: requestedFor,
        createdAt: createdAt,
      );
}
