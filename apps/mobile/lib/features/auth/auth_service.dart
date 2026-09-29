import 'dart:math';
import 'package:crypto/crypto.dart' show sha256;
import 'dart:convert' show utf8;
import 'package:google_sign_in/google_sign_in.dart';
import 'package:sign_in_with_apple/sign_in_with_apple.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../env.dart';

/// Thrown when a social provider button is tapped before its OAuth client
/// is configured (see Env.googleServerClientId / .env.example) — expected
/// until the Google Cloud / Apple Developer accounts from the Native App
/// Blueprint setup checklist exist.
class ProviderNotConfiguredException implements Exception {
  ProviderNotConfiguredException(this.message);
  final String message;
  @override
  String toString() => message;
}

class AuthService {
  AuthService(this._client);

  final SupabaseClient _client;
  bool _googleInitialized = false;

  Stream<AuthState> get onAuthStateChange => _client.auth.onAuthStateChange;
  User? get currentUser => _client.auth.currentUser;

  Future<void> signUp({required String fullName, required String email, required String password}) async {
    await _client.auth.signUp(
      email: email,
      password: password,
      data: {'full_name': fullName},
    );
  }

  Future<void> signIn({required String email, required String password}) async {
    await _client.auth.signInWithPassword(email: email, password: password);
  }

  /// Confirms a signup using the 6-digit code from the "Confirm signup"
  /// email (Supabase issues this as the same OTP the confirmation link
  /// embeds — see supabase/config.toml's otp_length). Succeeds straight
  /// into a session, no link/browser round-trip needed.
  Future<void> verifySignupOtp({required String email, required String token}) async {
    await _client.auth.verifyOTP(email: email, token: token, type: OtpType.signup);
  }

  Future<void> resendSignupOtp(String email) async {
    await _client.auth.resend(type: OtpType.signup, email: email);
  }

  Future<void> sendPasswordResetEmail(String email) async {
    await _client.auth.resetPasswordForEmail(email);
  }

  Future<void> signOut() async {
    await _client.auth.signOut();
  }

  Future<void> signInWithGoogle() async {
    final serverClientId = Env.googleServerClientId;
    if (serverClientId == null) {
      throw ProviderNotConfiguredException(
        'Google sign-in isn\'t set up yet — add GOOGLE_SERVER_CLIENT_ID to .env once the Google Cloud OAuth client exists.',
      );
    }

    final googleSignIn = GoogleSignIn.instance;
    if (!_googleInitialized) {
      await googleSignIn.initialize(
        serverClientId: serverClientId,
        clientId: Env.googleIosClientId,
      );
      _googleInitialized = true;
    }

    final account = await googleSignIn.authenticate();
    final idToken = account.authentication.idToken;
    if (idToken == null) {
      throw const AuthException('Google did not return an ID token.');
    }

    await _client.auth.signInWithIdToken(provider: OAuthProvider.google, idToken: idToken);
  }

  Future<void> signInWithApple() async {
    final rawNonce = _generateNonce();
    final hashedNonce = sha256.convert(utf8.encode(rawNonce)).toString();

    final credential = await SignInWithApple.getAppleIDCredential(
      scopes: [AppleIDAuthorizationScopes.email, AppleIDAuthorizationScopes.fullName],
      nonce: hashedNonce,
    );

    final identityToken = credential.identityToken;
    if (identityToken == null) {
      throw const AuthException('Apple did not return an identity token.');
    }

    await _client.auth.signInWithIdToken(
      provider: OAuthProvider.apple,
      idToken: identityToken,
      nonce: rawNonce,
    );

    // Apple only sends the name on the very first authorization ever, so
    // capture it into user metadata now or it's gone for good.
    final givenName = credential.givenName;
    final familyName = credential.familyName;
    if (givenName != null || familyName != null) {
      final fullName = [givenName, familyName].whereType<String>().join(' ');
      if (fullName.isNotEmpty) {
        await _client.auth.updateUser(UserAttributes(data: {'full_name': fullName}));
      }
    }
  }

  String _generateNonce([int length = 32]) {
    const charset = '0123456789ABCDEFGHIJKLMNOPQRSTUVXYZabcdefghijklmnopqrstuvwxyz-._';
    final random = Random.secure();
    return List.generate(length, (_) => charset[random.nextInt(charset.length)]).join();
  }

  /// Deletes the signed-in guest's account. Client SDKs can't delete an
  /// auth.users row directly, so this calls the delete-account edge
  /// function (service role), which also clears their guest_sessions row.
  Future<void> deleteAccount() async {
    final response = await _client.functions.invoke('delete-account');
    if (response.status != 200) {
      throw AuthException('Failed to delete account (status ${response.status}).');
    }
    await _client.auth.signOut();
  }
}
