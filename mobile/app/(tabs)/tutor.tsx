import { useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
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
const DEFAULT_DOCUMENT_INSTRUCTION = "Analyse ce document et explique-moi les points importants.";

export default function TutorScreen() {
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: nextId(),
      role: "assistant",
      content:
        "Bonjour ! Je suis votre Kourou IA. Posez-moi une question sur un point du cours, je suis là pour vous aider à progresser.",
    },
  ]);
  const [input, setInput] = useState("");
  const [documents, setDocuments] = useState<{ name: string; content: string; encoding?: "base64" }[]>([]);
  const [documentPending, setDocumentPending] = useState(false);
  const conversationIdRef = useRef<string | null>(null);
  const listRef = useRef<FlatList<ChatMessage>>(null);

  const { streamingText, isStreaming, error, sendMessage } = useTutorStream((fullText, conversationId) => {
    conversationIdRef.current = conversationId;
    setDocumentPending(false);
    setMessages((prev) => [...prev, { id: nextId(), role: "assistant", content: fullText }]);
  });

  const handleSend = () => {
    const trimmed = input.trim();
    const message = trimmed || (documents.length > 0 ? DEFAULT_DOCUMENT_INSTRUCTION : "");
    if (!message || isStreaming) return;
    const documentsToSend = documents.length > 0 ? documents : undefined;
    const displayedMessage = documentsToSend?.length
      ? `${message}\n\n📎 ${documentsToSend.map((document) => document.name).join(", ")}`
      : message;

    setMessages((prev) => [...prev, { id: nextId(), role: "user", content: displayedMessage }]);
    setInput("");
    setDocumentPending(Boolean(documentsToSend?.length));
    setDocuments([]);
    sendMessage({
      message,
      conversation: conversationIdRef.current,
      documents: documentsToSend,
    });
    requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
  };

  const displayedMessages: ChatMessage[] = isStreaming
    ? [...messages, { id: "streaming", role: "assistant", content: streamingText || "…" }]
    : messages;

  const handleImportDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          "text/*",
          "application/json",
          "application/pdf",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ],
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.length) return;

      const file = result.assets[0];
      const isBinaryDocument = file.mimeType === "application/pdf" || file.name?.toLowerCase().endsWith(".docx");
      const fileContent = await FileSystem.readAsStringAsync(
        file.uri,
        isBinaryDocument ? { encoding: "base64" } : undefined
      );
      if (!fileContent.trim()) {
        Alert.alert("Fichier vide", "Le fichier sélectionné ne contient aucun texte exploitable.");
        return;
      }

      setDocuments((prev) => [
        ...prev,
        {
          name: file.name ?? `document-${prev.length + 1}`,
          content: fileContent,
          ...(isBinaryDocument ? { encoding: "base64" as const } : {}),
        },
      ]);
    } catch {
      Alert.alert(
        "Import impossible",
        "Sélectionnez un fichier texte, PDF ou Word (.docx) de moins de 30 Mo."
      );
    }
  };

  const handleClearDocuments = () => {
    setDocuments([]);
  };

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
          <Text style={styles.headerTitle}>KOUROU IA</Text>
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
              {item.id === "streaming" && !streamingText ? (
                <View style={styles.thinkingIndicator}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={styles.thinkingText}>
                    {documentPending ? "Analyse du document…" : "Préparation de la réponse…"}
                  </Text>
                </View>
              ) : (
                <Text style={item.role === "user" ? styles.bubbleTextUser : styles.bubbleTextAssistant}>
                  {item.content}
                </Text>
              )}
            </View>
          </View>
        )}
      />

      {documents.length > 0 ? (
        <View style={styles.documentsBar}>
          <View style={styles.documentInfo}>
            <Ionicons name="document-text" size={16} color={colors.primary} />
            <Text style={styles.documentLabel}>{documents.length} document(s) importé(s)</Text>
          </View>
          <Pressable style={styles.clearDocumentsButton} onPress={handleClearDocuments}>
            <Text style={styles.clearDocumentsText}>Supprimer</Text>
          </Pressable>
        </View>
      ) : null}

      {documents.length > 0 ? <Text style={styles.documentsWarning}>Les documents importés peuvent augmenter la consommation de tokens et réduire le nombre de messages disponibles.</Text> : null}
      {error && <Text style={styles.errorText}>{error}</Text>}

      <View style={[styles.inputRow, { paddingBottom: insets.bottom + spacing.md }]}> 
        <Pressable style={styles.importIconButton} onPress={handleImportDocument} disabled={isStreaming}>
          <Ionicons name="attach" size={18} color={colors.primary} />
        </Pressable>

        <TextInput
          style={styles.input}
          placeholder={documents.length > 0 ? "Ajoutez une consigne (facultatif)…" : "Posez votre question…"}
          placeholderTextColor={colors.textTertiary}
          value={input}
          onChangeText={setInput}
          multiline
          editable={!isStreaming}
        />

        <Pressable
          style={[styles.sendButton, (!input.trim() && documents.length === 0 || isStreaming) && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={(!input.trim() && documents.length === 0) || isStreaming}
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
  thinkingIndicator: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  thinkingText: { ...typography.caption, color: colors.textSecondary },
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
  importIconButton: {
    width: 44,
    height: 44,
    borderRadius: radii.full,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
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
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  importButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radii.full,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  importButtonText: { ...typography.captionMedium, color: colors.white },
  documentsBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.sm,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  documentInfo: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  documentLabel: { ...typography.captionMedium, color: colors.textPrimary },
  documentsWarning: { ...typography.caption, color: colors.textSecondary, paddingHorizontal: spacing.xxl, paddingBottom: spacing.xs },
  clearDocumentsButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  clearDocumentsText: { ...typography.captionMedium, color: colors.textSecondary },
});
