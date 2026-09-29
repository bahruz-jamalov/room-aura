import 'package:flutter/material.dart';
import 'tokens.dart';

class AppTheme {
  static ThemeData get light {
    final colorScheme = ColorScheme.fromSeed(
      seedColor: RaColors.accent,
      brightness: Brightness.light,
      primary: RaColors.accent,
      onPrimary: RaColors.accentContrast,
      surface: RaColors.surface,
      onSurface: RaColors.textPrimary,
      error: RaColors.danger,
    );

    return ThemeData(
      useMaterial3: true,
      colorScheme: colorScheme,
      scaffoldBackgroundColor: RaColors.bg,
      appBarTheme: const AppBarTheme(
        backgroundColor: RaColors.bg,
        foregroundColor: RaColors.textPrimary,
        elevation: 0,
        centerTitle: false,
      ),
      cardTheme: CardThemeData(
        color: RaColors.surface,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(RaRadius.card),
          side: const BorderSide(color: RaColors.border),
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: RaColors.accent,
          foregroundColor: RaColors.accentContrast,
          minimumSize: const Size.fromHeight(RaSize.touchTarget),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(RaRadius.control),
          ),
          textStyle: const TextStyle(fontSize: RaText.base, fontWeight: FontWeight.w600),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: RaColors.surface,
        contentPadding: const EdgeInsets.symmetric(horizontal: RaSpace.s4, vertical: RaSpace.s3),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(RaRadius.control),
          borderSide: const BorderSide(color: RaColors.border),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(RaRadius.control),
          borderSide: const BorderSide(color: RaColors.border),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(RaRadius.control),
          borderSide: const BorderSide(color: RaColors.accent, width: 1.5),
        ),
      ),
      textTheme: const TextTheme(
        headlineMedium: TextStyle(fontSize: RaText.xxl, fontWeight: FontWeight.w700, color: RaColors.textPrimary),
        titleLarge: TextStyle(fontSize: RaText.xl, fontWeight: FontWeight.w600, color: RaColors.textPrimary),
        bodyLarge: TextStyle(fontSize: RaText.base, color: RaColors.textPrimary),
        bodyMedium: TextStyle(fontSize: RaText.sm, color: RaColors.textSecondary),
      ),
      dividerTheme: const DividerThemeData(color: RaColors.border, thickness: 1),
    );
  }
}
