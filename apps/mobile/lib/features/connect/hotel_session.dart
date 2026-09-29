class HotelSession {
  const HotelSession({
    required this.guestSessionId,
    required this.hotelId,
    required this.hotelName,
    required this.hotelLogoUrl,
    required this.roomId,
    required this.roomNumber,
  });

  final String guestSessionId;
  final String hotelId;
  final String hotelName;
  final String? hotelLogoUrl;
  final String roomId;
  final String roomNumber;
}

enum RedeemErrorCode {
  invalidCode,
  expiredCode,
  roomRequired,
  roomNotFound,
  badRequest,
  unauthorized,
  serverError,
  networkError,
}

class RedeemFailure implements Exception {
  const RedeemFailure(this.code);
  final RedeemErrorCode code;
}
