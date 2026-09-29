// Ported from packages/ui/src/*.css — [data-app="tourist"] semantic tokens.
// Keep in sync with the web tourist app's brand palette.
import 'package:flutter/material.dart';

class RaColors {
  static const bg = Color(0xFFFAF7F2);
  static const surface = Color(0xFFFFFFFF);
  static const surfaceSunken = Color(0xFFF3EDE4);
  static const border = Color(0xFFE8DDCF);
  static const textPrimary = Color(0xFF2A2420);
  static const textSecondary = Color(0xFF6B6055);
  static const accent = Color(0xFFC1633D);
  static const accentContrast = Color(0xFFFFFFFF);
  static const accentSoft = Color(0xFFF3E2D8);
  static const success = Color(0xFF2F8F5B);
  static const danger = Color(0xFFC94A3F);

  // Request/order status colors — kept in sync with
  // packages/shared/src/request-state-machine.ts
  static const statusNew = Color(0xFF64748B);
  static const statusAccepted = Color(0xFF6366F1);
  static const statusInProgress = Color(0xFFF59E0B);
  static const statusOnTheWay = Color(0xFF06B6D4);
  static const statusCompleted = Color(0xFF10B981);
  static const statusCancelled = Color(0xFFEF4444);
}

class RaSpace {
  static const s1 = 4.0;
  static const s2 = 8.0;
  static const s3 = 12.0;
  static const s4 = 16.0;
  static const s5 = 20.0;
  static const s6 = 24.0;
  static const s8 = 32.0;
  static const s10 = 40.0;
  static const s12 = 48.0;
  static const s16 = 64.0;

  static const pageGutter = s4;
}

class RaRadius {
  static const sm = 6.0;
  static const md = 12.0;
  static const lg = 20.0;
  static const full = 999.0;

  static const card = lg;
  static const control = md;
}

class RaSize {
  // WCAG 2.1 AA minimum touch target.
  static const touchTarget = 48.0;
}

class RaText {
  static const xs = 12.0;
  static const sm = 14.0;
  static const base = 16.0;
  static const lg = 18.0;
  static const xl = 22.0;
  static const xxl = 28.0;
  static const xxxl = 34.0;
}
