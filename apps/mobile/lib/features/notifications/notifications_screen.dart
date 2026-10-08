import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../theme/tokens.dart';
import '../requests/request_detail_screen.dart';
import 'notification_models.dart';
import 'notification_text.dart';
import 'notifications_service.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  late final _notificationsService = NotificationsService(Supabase.instance.client);
  List<GuestNotification>? _notifications;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final notifications = await _notificationsService.fetchMyNotifications();
    if (!mounted) return;
    setState(() => _notifications = notifications);
  }

  Future<void> _open(GuestNotification notification) async {
    if (!notification.isRead) {
      await _notificationsService.markAsRead(notification.id);
      setState(() {
        final index = _notifications!.indexWhere((n) => n.id == notification.id);
        if (index != -1) _notifications![index] = notification.copyWithReadAt(DateTime.now());
      });
    }
    final requestId = notification.requestId;
    if (requestId != null && mounted) {
      Navigator.of(context).push(MaterialPageRoute(builder: (_) => RequestDetailScreen(requestId: requestId)));
    }
  }

  @override
  Widget build(BuildContext context) {
    final notifications = _notifications;
    return Scaffold(
      appBar: AppBar(title: const Text('Notifications')),
      body: SafeArea(
        child: notifications == null
            ? const Center(child: CircularProgressIndicator())
            : notifications.isEmpty
                ? const Center(child: Text('No notifications yet', style: TextStyle(color: RaColors.textSecondary)))
                : RefreshIndicator(
                    onRefresh: _load,
                    child: ListView.separated(
                      padding: const EdgeInsets.all(RaSpace.pageGutter),
                      itemCount: notifications.length,
                      separatorBuilder: (_, _) => const SizedBox(height: RaSpace.s3),
                      itemBuilder: (context, index) => _NotificationTile(
                        notification: notifications[index],
                        onTap: () => _open(notifications[index]),
                      ),
                    ),
                  ),
      ),
    );
  }
}

class _NotificationTile extends StatelessWidget {
  const _NotificationTile({required this.notification, required this.onTap});

  final GuestNotification notification;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final isUnread = !notification.isRead;
    return Material(
      color: isUnread ? RaColors.accentSoft : RaColors.surface,
      borderRadius: BorderRadius.circular(RaRadius.card),
      child: InkWell(
        borderRadius: BorderRadius.circular(RaRadius.card),
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.all(RaSpace.s4),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(RaRadius.card),
            border: Border.all(color: RaColors.border),
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Text(
                  notificationMessage(notification),
                  style: TextStyle(fontWeight: isUnread ? FontWeight.w600 : FontWeight.w400),
                ),
              ),
              if (isUnread) ...[
                const SizedBox(width: RaSpace.s2),
                Container(
                  width: 8,
                  height: 8,
                  margin: const EdgeInsets.only(top: 6),
                  decoration: const BoxDecoration(color: RaColors.accent, shape: BoxShape.circle),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
