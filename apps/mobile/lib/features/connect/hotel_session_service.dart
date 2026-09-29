import 'package:supabase_flutter/supabase_flutter.dart';
import 'hotel_session.dart';

class HotelSessionService {
  HotelSessionService(this._client);

  final SupabaseClient _client;

  /// The signed-in guest's active hotel/room, if `redeem-access` has
  /// already bound their account to one — RLS (guest_session_id(), see
  /// supabase/migrations/00000000000008_auth_helpers.sql) scopes these
  /// queries to their own session with no manual filter needed.
  Future<HotelSession?> fetchActiveSession() async {
    // .limit(1) before .maybeSingle(): RLS scopes these to "this guest's
    // own" rows, which is normally 0 or 1 — but maybeSingle() throws (rather
    // than picking one) if a policy or edge case ever returns more than
    // one, which would otherwise strand the caller on a stuck loading state.
    final results = await Future.wait([
      _client.from('guest_sessions').select('id, room_id').limit(1).maybeSingle(),
      _client.from('hotels').select('id, name, logo_url').limit(1).maybeSingle(),
      _client.from('rooms').select('number').limit(1).maybeSingle(),
    ]);
    final session = results[0];
    final hotel = results[1];
    final room = results[2];
    if (session == null || hotel == null || room == null) return null;
    return HotelSession(
      guestSessionId: session['id'] as String,
      hotelId: hotel['id'] as String,
      hotelName: hotel['name'] as String,
      hotelLogoUrl: hotel['logo_url'] as String?,
      roomId: session['room_id'] as String,
      roomNumber: room['number'] as String,
    );
  }

  /// Redeems the code, then re-reads the resulting session via
  /// [fetchActiveSession] rather than building it from the function's
  /// response — that's the single source of truth for the room's id
  /// (needed for requests.insert, but not part of the function's reply).
  Future<HotelSession> redeemAccess({
    required String token,
    String? roomNumber,
    required String locale,
  }) async {
    try {
      await _client.functions.invoke(
        'redeem-access',
        body: {'token': token, 'roomNumber': roomNumber, 'locale': locale},
      );
      final session = await fetchActiveSession();
      if (session == null) throw const RedeemFailure(RedeemErrorCode.serverError);
      return session;
    } on FunctionException catch (e) {
      final details = e.details;
      final errorKey = details is Map ? details['error'] as String? : null;
      throw RedeemFailure(_mapErrorCode(errorKey));
    } on RedeemFailure {
      rethrow;
    } catch (_) {
      throw const RedeemFailure(RedeemErrorCode.networkError);
    }
  }

  RedeemErrorCode _mapErrorCode(String? key) {
    switch (key) {
      case 'invalid_code':
        return RedeemErrorCode.invalidCode;
      case 'expired_code':
        return RedeemErrorCode.expiredCode;
      case 'room_required':
        return RedeemErrorCode.roomRequired;
      case 'room_not_found':
        return RedeemErrorCode.roomNotFound;
      case 'bad_request':
        return RedeemErrorCode.badRequest;
      case 'unauthorized':
        return RedeemErrorCode.unauthorized;
      default:
        return RedeemErrorCode.serverError;
    }
  }
}
