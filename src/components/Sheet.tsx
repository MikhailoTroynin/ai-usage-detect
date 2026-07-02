import React, { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, View, Text, Animated, Easing, ScrollView, Dimensions } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

interface SheetProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
}

export function Sheet({ open, onClose, children, title }: SheetProps) {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(open);
  const translateY = useRef(new Animated.Value(Dimensions.get('window').height)).current;

  useEffect(() => {
    if (open) {
      setMounted(true);
      Animated.timing(translateY, { toValue: 0, duration: 300, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    } else {
      Animated.timing(translateY, { toValue: Dimensions.get('window').height, duration: 260, easing: Easing.in(Easing.cubic), useNativeDriver: true })
        .start(() => setMounted(false));
    }
  }, [open]);

  if (!mounted) return null;

  return (
    <Modal transparent visible animationType="none" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable onPress={onClose} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)' }} />
        <Animated.View style={{
          transform: [{ translateY }],
          backgroundColor: theme.surface,
          borderTopLeftRadius: 28, borderTopRightRadius: 28,
          paddingTop: 12, paddingHorizontal: 18, paddingBottom: 34,
          maxHeight: '80%',
        }}>
          <View style={{ width: 38, height: 5, borderRadius: 999, backgroundColor: theme.borderStrong, alignSelf: 'center', marginBottom: 14 }} />
          {title && <Text style={{ fontSize: 19, fontWeight: '700', marginBottom: 14, letterSpacing: -0.4, color: theme.text }}>{title}</Text>}
          <ScrollView showsVerticalScrollIndicator={false}>
            {children}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}
