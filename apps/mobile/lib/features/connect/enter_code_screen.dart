import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../theme/tokens.dart';
import 'hotel_session.dart';
import 'hotel_session_service.dart';

const _errorMessages = {
  RedeemErrorCode.invalidCode: 'That code is not valid. Double-check and try again.',
  RedeemErrorCode.expiredCode: 'That code has expired. Ask the front desk for a new one.',
  RedeemErrorCode.roomRequired: 'Enter your room number to continue.',
  RedeemErrorCode.roomNotFound: "That room number wasn't found for this code.",
  RedeemErrorCode.badRequest: 'That code is not valid. Double-check and try again.',
  RedeemErrorCode.unauthorized: 'Please sign in again.',
  RedeemErrorCode.serverError: 'Something went wrong. Please try again.',
  RedeemErrorCode.networkError: 'Could not reach the network. Please try again.',
};

class EnterCodeScreen extends StatefulWidget {
  const EnterCodeScreen({
    super.key,
    required this.hotelSessionService,
    required this.onConnected,
    this.initialToken,
  });

  final HotelSessionService hotelSessionService;
  final void Function(HotelSession session) onConnected;
  final String? initialToken;

  @override
  State<EnterCodeScreen> createState() => _EnterCodeScreenState();
}

class _EnterCodeScreenState extends State<EnterCodeScreen> {
  final _formKey = GlobalKey<FormState>();
  late final _codeController = TextEditingController(text: widget.initialToken);
  final _roomController = TextEditingController();
  bool _submitting = false;
  String? _errorMessage;

  @override
  void dispose() {
    _codeController.dispose();
    _roomController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _submitting = true;
      _errorMessage = null;
    });
    try {
      final session = await widget.hotelSessionService.redeemAccess(
        token: _codeController.text.trim(),
        roomNumber: _roomController.text.trim(),
        locale: 'en',
      );
      widget.onConnected(session);
    } on RedeemFailure catch (e) {
      setState(() => _errorMessage = _errorMessages[e.code]);
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Enter code')),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(RaSpace.pageGutter),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                TextFormField(
                  controller: _codeController,
                  textCapitalization: TextCapitalization.characters,
                  inputFormatters: [UpperCaseTextFormatter()],
                  decoration: const InputDecoration(labelText: 'Access code', hintText: 'AB12CD34'),
                  validator: (value) => (value == null || value.trim().isEmpty) ? 'Enter the code' : null,
                ),
                const SizedBox(height: RaSpace.s4),
                TextFormField(
                  controller: _roomController,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(labelText: 'Room number', hintText: '508'),
                  validator: (value) => (value == null || value.trim().isEmpty) ? 'Enter your room number' : null,
                ),
                if (_errorMessage != null) ...[
                  const SizedBox(height: RaSpace.s4),
                  Text(_errorMessage!, style: const TextStyle(color: RaColors.danger), textAlign: TextAlign.center),
                ],
                const SizedBox(height: RaSpace.s6),
                ElevatedButton(
                  onPressed: _submitting ? null : _submit,
                  child: _submitting
                      ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2))
                      : const Text('Confirm'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class UpperCaseTextFormatter extends TextInputFormatter {
  @override
  TextEditingValue formatEditUpdate(TextEditingValue oldValue, TextEditingValue newValue) {
    return newValue.copyWith(text: newValue.text.toUpperCase());
  }
}
