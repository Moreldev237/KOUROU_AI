import { useRef, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTutorStream } from "@/hooks/useTutorStream";
import { colors, radii, spacing, typography } from "@/theme";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

let messageCounter = 0;
const nextId = () => `local-${Date.now()}-${messageCounter++}`;

export default function TutorScreen() {
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: nextId(),
      role: "assistant",
      content:
        "Bonjour ! Je suis votre tuteur IA. Posez-moi une question sur un point du cours, je suis là pour vous aider à progresser.",
    },
  ]);
  const [input, setInput] = useState("");
  const conversationIdRef = useRef<string | null>(null);
  const listRef = useRef<FlatList<ChatMessage>>(null);

  const { streamingText, isStreaming, error, sendMessage } = useTutorStream((fullText, conversationId) => {
    conversationIdRef.current = conversationId;
    setMessages((prev) => [...prev, { id: nextId(), role: "assistant", content: fullText }]);
  });

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;

    setMessages((prev) => [...prev, { id: nextId(), role: "user", content: trimmed }]);
    setInput("");
    sendMessage({ message: trimmed, conversation: conversationIdRef.current });
    requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
  };

  const displayedMessages: ChatMessage[] = isStreaming
    ? [...messages, { id: "streaming", role: "assistant", content: streamingText || "…" }]
    : messages;

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={insets.top}
    >
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <View style={styles.headerIcon}>
          <Ionicons name="sparkles" size={18} color={colors.white} />
        </View>
        <View>
          <Text style={styles.headerTitle}>Tuteur IA</Text>
          <Text style={styles.headerSubtitle}>{isStreaming ? "En train d'écrire…" : "Toujours disponible"}</Text>
        </View>
      </View>

      <FlatList
        ref={listRef}
        data={displayedMessages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        renderItem={({ item }) => (
          <View style={[styles.bubbleRow, item.role === "user" ? styles.bubbleRowUser : styles.bubbleRowAssistant]}>
            <View style={[styles.bubble, item.role === "user" ? styles.bubbleUser : styles.bubbleAssistant]}>
              <Text style={item.role === "user" ? styles.bubbleTextUser : styles.bubbleTextAssistant}>
                {item.content}
              </Text>
            </View>
          </View>
        )}
      />

      {error && <Text style={styles.errorText}>{error}</Text>}

      <View style={[styles.inputRow, { paddingBottom: insets.bottom + spacing.md }]}>
        <TextInput
          style={styles.input}
          placeholder="Posez votre question…"
          placeholderTextColor={colors.textTertiary}
          value={input}
          onChangeText={setInput}
          multiline
          editable={!isStreaming}
        />
        <Pressable
          style={[styles.sendButton, (!input.trim() || isStreaming) && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={!input.trim() || isStreaming}
        >
          <Ionicons name="arrow-up" size={20} color={colors.white} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.xxl,
    paddingBottom: spacing.lg,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: radii.sm,
    backgroundColor: colors.accentGreen,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { ...typography.h3, color: colors.textPrimary },
  headerSubtitle: { ...typography.caption, color: colors.textSecondary },
  messagesList: { padding: spacing.xxl, gap: spacing.md },
  bubbleRow: { flexDirection: "row" },
  bubbleRowUser: { justifyContent: "flex-end" },
  bubbleRowAssistant: { justifyContent: "flex-start" },
  bubble: { maxWidth: "82%", borderRadius: radii.lg, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  bubbleUser: { backgroundColor: colors.primary, borderBottomRightRadius: radii.sm },
  bubbleAssistant: { backgroundColor: colors.surface, borderBottomLeftRadius: radii.sm, borderWidth: 1, borderColor: colors.border },
  bubbleTextUser: { ...typography.body, color: colors.white },
  bubbleTextAssistant: { ...typography.body, color: colors.textPrimary },
  errorText: { ...typography.caption, color: colors.error, textAlign: "center", marginBottom: spacing.sm },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.sm,
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  input: {
    flex: 1,
    maxHeight: 100,
    backgroundColor: colors.background,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    ...typography.body,
    color: colors.textPrimary,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: radii.full,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonDisabled: { opacity: 0.4 },
});
