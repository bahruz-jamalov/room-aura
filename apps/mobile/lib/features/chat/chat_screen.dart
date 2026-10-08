import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../theme/tokens.dart';
import '../catalogue/catalogue_models.dart';
import '../catalogue/catalogue_service.dart';
import '../connect/hotel_session_holder.dart';
import '../home/category_group_screen.dart';
import '../menu/menu_categories_screen.dart';
import '../services/service_category_screen.dart';
import 'chat_models.dart';
import 'chat_service.dart';

class _Bubble {
  const _Bubble({required this.text, required this.fromGuest, this.action});
  final String text;
  final bool fromGuest;
  final Widget? action;
}

class ChatScreen extends StatefulWidget {
  const ChatScreen({super.key});

  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  late final _chatService = ChatService(Supabase.instance.client);
  late final _catalogueService = CatalogueService(Supabase.instance.client);
  final _textController = TextEditingController();
  final _scrollController = ScrollController();

  List<HotelFaq> _faqs = [];
  List<ServiceCategory> _categories = [];
  ChatThread? _thread;
  RealtimeChannel? _channel;
  final List<_Bubble> _localBubbles = [];
  List<ChatMessage> _threadMessages = [];
  bool _loading = true;
  bool _sending = false;

  @override
  void initState() {
    super.initState();
    _bootstrap();
  }

  @override
  void dispose() {
    if (_channel != null) Supabase.instance.client.removeChannel(_channel!);
    _textController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  Future<void> _bootstrap() async {
    final results = await Future.wait([
      _chatService.fetchFaqs(),
      _catalogueService.fetchCategories(locale: 'en', fallbackLocale: 'en'),
      _chatService.fetchOpenThread(),
    ]);
    _faqs = results[0] as List<HotelFaq>;
    _categories = results[1] as List<ServiceCategory>;
    final existingThread = results[2] as ChatThread?;
    if (existingThread != null) {
      await _enterThread(existingThread);
    } else {
      _localBubbles.add(const _Bubble(text: "Hi! Ask me a question, or tell me what you need.", fromGuest: false));
    }
    if (mounted) setState(() => _loading = false);
  }

  Future<void> _enterThread(ChatThread thread) async {
    final messages = await _chatService.fetchMessages(thread.id);
    _channel = _chatService.subscribeToMessages(thread.id, (message) {
      if (!mounted) return;
      setState(() => _threadMessages = [..._threadMessages, message]);
      _scrollToBottom();
    });
    if (mounted) {
      setState(() {
        _thread = thread;
        _threadMessages = messages;
      });
    }
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!_scrollController.hasClients) return;
      _scrollController.animateTo(
        _scrollController.position.maxScrollExtent,
        duration: const Duration(milliseconds: 200),
        curve: Curves.easeOut,
      );
    });
  }

  void _openCategory(ServiceCategory category) {
    Navigator.of(context).pop();
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => category.hasChildren
            ? CategoryGroupScreen(category: category)
            : category.isMenu
                ? MenuCategoriesScreen(category: category)
                : ServiceCategoryScreen(category: category),
      ),
    );
  }

  Future<void> _escalateToStaff(String question) async {
    final hotelSession = context.read<HotelSessionHolder>().session!;
    setState(() => _sending = true);
    try {
      final thread = await _chatService.createThread(
        hotelId: hotelSession.hotelId,
        roomId: hotelSession.roomId,
        guestSessionId: hotelSession.guestSessionId,
      );
      await _chatService.sendMessage(
        threadId: thread.id,
        hotelId: hotelSession.hotelId,
        guestSessionId: hotelSession.guestSessionId,
        body: question,
      );
      await _enterThread(thread);
    } finally {
      if (mounted) setState(() => _sending = false);
    }
    _scrollToBottom();
  }

  Future<void> _submitText() async {
    final text = _textController.text.trim();
    if (text.isEmpty || _sending) return;
    _textController.clear();

    if (_thread != null) {
      final hotelSession = context.read<HotelSessionHolder>().session!;
      setState(() => _sending = true);
      try {
        await _chatService.sendMessage(
          threadId: _thread!.id,
          hotelId: hotelSession.hotelId,
          guestSessionId: hotelSession.guestSessionId,
          body: text,
        );
      } finally {
        if (mounted) setState(() => _sending = false);
      }
      return;
    }

    final match = _chatService.matchFaq(_faqs, text);
    setState(() {
      _localBubbles.add(_Bubble(text: text, fromGuest: true));
      if (match != null) {
        _localBubbles.add(_Bubble(text: match.answer, fromGuest: false));
      } else {
        _localBubbles.add(
          _Bubble(
            text: "I don't have an answer for that yet.",
            fromGuest: false,
            action: OutlinedButton(
              onPressed: _sending ? null : () => _escalateToStaff(text),
              child: const Text('Talk to hotel staff'),
            ),
          ),
        );
      }
    });
    _scrollToBottom();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(_thread != null ? 'Chat with staff' : 'Ask ROOM-AURA')),
      body: SafeArea(
        child: _loading
            ? const Center(child: CircularProgressIndicator())
            : Column(
                children: [
                  Expanded(
                    child: ListView(
                      controller: _scrollController,
                      padding: const EdgeInsets.all(RaSpace.pageGutter),
                      children: [
                        if (_thread == null && _categories.isNotEmpty) ...[
                          const Text('Or jump straight to:', style: TextStyle(color: RaColors.textSecondary, fontSize: RaText.sm)),
                          const SizedBox(height: RaSpace.s2),
                          Wrap(
                            spacing: RaSpace.s2,
                            runSpacing: RaSpace.s2,
                            children: [
                              for (final category in _categories)
                                ActionChip(
                                  label: Text(category.name),
                                  onPressed: () => _openCategory(category),
                                ),
                            ],
                          ),
                          const SizedBox(height: RaSpace.s5),
                        ],
                        if (_thread == null)
                          for (final bubble in _localBubbles) _ChatBubble(text: bubble.text, fromGuest: bubble.fromGuest, action: bubble.action)
                        else
                          for (final message in _threadMessages)
                            _ChatBubble(text: message.body, fromGuest: !message.isStaff, action: null),
                      ],
                    ),
                  ),
                  SafeArea(
                    top: false,
                    child: Padding(
                      padding: const EdgeInsets.all(RaSpace.s3),
                      child: Row(
                        children: [
                          Expanded(
                            child: TextField(
                              controller: _textController,
                              decoration: const InputDecoration(hintText: 'Type a message…'),
                              onSubmitted: (_) => _submitText(),
                            ),
                          ),
                          const SizedBox(width: RaSpace.s2),
                          IconButton.filled(
                            onPressed: _sending ? null : _submitText,
                            icon: const Icon(Icons.send),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
      ),
    );
  }
}

class _ChatBubble extends StatelessWidget {
  const _ChatBubble({required this.text, required this.fromGuest, required this.action});

  final String text;
  final bool fromGuest;
  final Widget? action;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: RaSpace.s3),
      child: Column(
        crossAxisAlignment: fromGuest ? CrossAxisAlignment.end : CrossAxisAlignment.start,
        children: [
          Container(
            constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.75),
            padding: const EdgeInsets.symmetric(horizontal: RaSpace.s4, vertical: RaSpace.s3),
            decoration: BoxDecoration(
              color: fromGuest ? RaColors.accent : RaColors.surface,
              borderRadius: BorderRadius.circular(RaRadius.control),
              border: fromGuest ? null : Border.all(color: RaColors.border),
            ),
            child: Text(text, style: TextStyle(color: fromGuest ? RaColors.accentContrast : RaColors.textPrimary)),
          ),
          if (action != null) Padding(padding: const EdgeInsets.only(top: RaSpace.s2), child: action!),
        ],
      ),
    );
  }
}
