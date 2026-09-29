class HotelFaq {
  const HotelFaq({required this.keyword, required this.question, required this.answer});
  final String keyword;
  final String question;
  final String answer;
}

class ChatThread {
  const ChatThread({required this.id, required this.status});
  final String id;
  final String status; // 'open' | 'closed'
}

class ChatMessage {
  const ChatMessage({
    required this.id,
    required this.threadId,
    required this.senderType,
    required this.body,
    required this.createdAt,
  });

  final String id;
  final String threadId;
  final String senderType; // 'guest' | 'staff'
  final String body;
  final DateTime createdAt;

  bool get isStaff => senderType == 'staff';
}
