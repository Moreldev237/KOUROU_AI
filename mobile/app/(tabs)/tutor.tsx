import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Alert,
  KeyboardAvoidingView,
  Modal,
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
import { useGetMeQuery } from "@/store/api/authApi";
import { useGetTutorMessagesQuery, useListTutorConversationsQuery } from "@/store/api/aiEngineApi";
import { colors, radii, spacing, typography } from "@/theme";
import { useLanguage } from "@/i18n";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

let messageCounter = 0;
const nextId = () => `local-${Date.now()}-${messageCounter++}`;
const DEFAULT_DOCUMENT_INSTRUCTION = "Analyse ce document et explique-moi les points importants.";
const MAX_DOCUMENTS = 3;
const MAX_DOCUMENT_SIZE_BYTES = 30 * 1024 * 1024;

function MarkdownMessage({ content }: { content: string }) {
  const lines = content.split("\n");

  return (
    <View style={styles.markdownMessage}>
      {lines.map((line, index) => {
        const trimmedLine = line.trim();
        if (!trimmedLine) return <View key={`space-${index}`} style={styles.markdownSpace} />;

        const headingMatch = trimmedLine.match(/^#{1,3}\s+(.+)$/);
        const bulletMatch = trimmedLine.match(/^(?:[*-])\s+(.+)$/);
        const text = headingMatch?.[1] ?? bulletMatch?.[1] ?? trimmedLine;
        const prefix = bulletMatch ? "• " : "";
        const lineStyle = headingMatch ? styles.markdownHeading : styles.markdownLine;
        const fragments = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);

        return (
          <Text key={`line-${index}`} style={lineStyle}>
            {prefix}
            {fragments.map((fragment, fragmentIndex) => {
              if (fragment.startsWith("**") && fragment.endsWith("**")) {
                return <Text key={`bold-${fragmentIndex}`} style={styles.markdownBold}>{fragment.slice(2, -2)}</Text>;
              }
              if (fragment.startsWith("*") && fragment.endsWith("*")) {
                return <Text key={`italic-${fragmentIndex}`} style={styles.markdownItalic}>{fragment.slice(1, -1)}</Text>;
              }
              return fragment;
            })}
          </Text>
        );
      })}
    </View>
  );
}

export default function TutorScreen() {
  const insets = useSafeAreaInsets();
  const { language, t } = useLanguage();
  const { data: user } = useGetMeQuery();
  const { data: conversations, refetch: refetchConversations } = useListTutorConversationsQuery();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: nextId(),
      role: "assistant",
      content:
        t("Bonjour ! Je suis votre Kourou AI. Posez-moi une question sur un point du cours, je suis là pour vous aider à progresser."),
    },
  ]);
  const [input, setInput] = useState("");
  const [documents, setDocuments] = useState<{ name: string; content: string; encoding?: "base64" }[]>([]);
  const [documentPending, setDocumentPending] = useState(false);
  const [showConversations, setShowConversations] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const conversationIdRef = useRef<string | null>(null);
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const { data: conversationMessages } = useGetTutorMessagesQuery(activeConversationId ?? "", { skip: !activeConversationId });

  const { streamingText, isStreaming, error, sendMessage, stop, retry } = useTutorStream((fullText, conversationId) => {
    conversationIdRef.current = conversationId;
    setActiveConversationId(conversationId);
    setDocumentPending(false);
    setMessages((prev) => [...prev, { id: nextId(), role: "assistant", content: fullText }]);
    refetchConversations();
  });

  useEffect(() => () => stop(), [stop]);

  useEffect(() => {
    if (!conversationMessages) return;
    conversationIdRef.current = activeConversationId;
    setMessages(conversationMessages.results.map((message) => ({ id: String(message.id), role: message.role, content: message.content })));
    setShowConversations(false);
  }, [activeConversationId, conversationMessages]);

  const startNewConversation = () => {
    stop();
    conversationIdRef.current = null;
    setActiveConversationId(null);
    setMessages([{ id: nextId(), role: "assistant", content: t("Bonjour ! Je suis votre Kourou AI. Posez-moi une question sur un point du cours, je suis là pour vous aider à progresser.") }]);
    setInput("");
    setDocuments([]);
    setShowConversations(false);
  };

  const handleSend = () => {
    const trimmed = input.trim();
    const message = trimmed || (documents.length > 0 ? t(DEFAULT_DOCUMENT_INSTRUCTION) : "");
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
      exam: user?.target_exam,
      documents: documentsToSend,
      language,
    });
    requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
  };

  const displayedMessages: ChatMessage[] = isStreaming
    ? [...messages, { id: "streaming", role: "assistant", content: streamingText || "…" }]
    : messages;

  const handleImportDocument = async () => {
    if (documents.length >= MAX_DOCUMENTS) {
      Alert.alert(t("Limite atteinte"), `${t("Vous pouvez importer au maximum")} ${MAX_DOCUMENTS} ${t("documents par demande.")}`);
      return;
    }
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
      if (file.size && file.size > MAX_DOCUMENT_SIZE_BYTES) {
        Alert.alert(t("Fichier trop volumineux"), t("Chaque document doit faire 30 Mo ou moins."));
        return;
      }
      const currentSize = documents.reduce((total, document) => total + document.content.length, 0);
      if (file.size && currentSize + file.size > MAX_DOCUMENT_SIZE_BYTES) {
        Alert.alert(t("Limite de taille atteinte"), t("La taille totale des documents ne peut pas dépasser 30 Mo."));
        return;
      }
      const isBinaryDocument = file.mimeType === "application/pdf" || file.name?.toLowerCase().endsWith(".docx");
      const fileContent = await FileSystem.readAsStringAsync(
        file.uri,
        isBinaryDocument ? { encoding: "base64" } : undefined
      );
      if (!fileContent.trim()) {
        Alert.alert(t("Fichier vide"), t("Le fichier sélectionné ne contient aucun texte exploitable."));
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
      Alert.alert(t("Import impossible"), t("Sélectionnez un fichier texte, PDF ou Word (.docx) de moins de 30 Mo."));
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
        <Pressable style={styles.headerIcon} onPress={() => setShowConversations(true)} accessibilityRole="button" accessibilityLabel={t("Voir mes conversations")}>
          <Ionicons name="sparkles" size={18} color={colors.white} />
        </Pressable>
        <Pressable style={styles.headerCopy} onPress={() => setShowConversations(true)} accessibilityRole="button" accessibilityLabel={t("Voir mes conversations")}>
          <Text style={styles.headerTitle}>KOUROU AI</Text>
          <Text style={styles.headerSubtitle}>{isStreaming ? t("En train d'écrire…") : t("Toujours disponible")}</Text>
        </Pressable>
        <Pressable style={styles.headerAction} onPress={isStreaming ? stop : startNewConversation} accessibilityRole="button" accessibilityLabel={t(isStreaming ? "Arrêter la réponse" : "Nouvelle conversation")}>
          <Ionicons name={isStreaming ? "stop" : "add"} size={20} color={colors.primary} />
        </Pressable>
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
                    {documentPending ? t("Analyse du document…") : t("Préparation de la réponse…")}
                  </Text>
                </View>
              ) : (
                item.role === "assistant" ? (
                  <MarkdownMessage content={item.content} />
                ) : (
                  <Text style={styles.bubbleTextUser}>{item.content}</Text>
                )
              )}
            </View>
          </View>
        )}
      />

      {documents.length > 0 ? (
        <View style={styles.documentsBar}>
          <View style={styles.documentInfo}>
            <Ionicons name="document-text" size={16} color={colors.primary} />
            <Text style={styles.documentLabel}>{documents.length} {t("document(s) importé(s)")}</Text>
          </View>
          <Pressable style={styles.clearDocumentsButton} onPress={handleClearDocuments}>
            <Text style={styles.clearDocumentsText}>{t("Supprimer")}</Text>
          </Pressable>
        </View>
      ) : null}

      {documents.length > 0 ? (
        <View style={styles.documentsWarning}>
          <Ionicons name="warning-outline" size={17} color={colors.warning} />
          <Text style={styles.documentsWarningText}>
            {documents.length}/{MAX_DOCUMENTS} {t("document(s). Leur analyse peut consommer davantage de tokens et réduire votre quota de messages.")}
          </Text>
        </View>
      ) : null}
      {error ? (
        <View style={styles.errorPanel}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryButton} onPress={retry} disabled={isStreaming}>
            <Ionicons name="refresh" size={16} color={colors.primary} />
            <Text style={styles.retryText}>{t("Réessayer")}</Text>
          </Pressable>
        </View>
      ) : null}

      {messages.length === 1 && !isStreaming ? (
        <View style={styles.suggestions}>
          {["Explique-moi ce chapitre", "Prépare-moi un QCM", "Résume ce cours"].map((suggestion) => (
            <Pressable key={suggestion} style={styles.suggestionChip} onPress={() => { setInput(t(suggestion)); }}>
              <Text style={styles.suggestionText}>{t(suggestion)}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      <View style={[styles.inputRow, { paddingBottom: insets.bottom + spacing.md }]}> 
        <Pressable style={styles.importIconButton} onPress={handleImportDocument} disabled={isStreaming}>
          <Ionicons name="attach" size={18} color={colors.primary} />
        </Pressable>

        <TextInput
          style={styles.input}
          placeholder={documents.length > 0 ? t("Ajoutez une consigne (facultatif)…") : t("Posez votre question…")}
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

      <Modal visible={showConversations} transparent animationType="slide" onRequestClose={() => setShowConversations(false)}>
        <View style={styles.historyOverlay}>
          <View style={styles.historyPanel}>
            <View style={styles.historyHeader}>
              <Text style={styles.historyTitle}>{t("Mes conversations")}</Text>
              <Pressable onPress={() => setShowConversations(false)}><Ionicons name="close" size={24} color={colors.textSecondary} /></Pressable>
            </View>
            <Pressable style={styles.newConversationButton} onPress={startNewConversation}>
              <Ionicons name="add" size={18} color={colors.white} /><Text style={styles.newConversationText}>{t("Nouvelle conversation")}</Text>
            </Pressable>
            <FlatList
              data={conversations?.results ?? []}
              keyExtractor={(item) => item.id}
              ListEmptyComponent={<Text style={styles.emptyHistory}>{t("Aucune conversation enregistrée.")}</Text>}
              renderItem={({ item }) => (
                <Pressable style={styles.conversationRow} onPress={() => setActiveConversationId(item.id)}>
                  <Ionicons name="chatbubble-ellipses-outline" size={19} color={colors.primary} />
                  <View style={styles.conversationCopy}><Text style={styles.conversationTitle} numberOfLines={1}>{item.title || t("Conversation sans titre")}</Text><Text style={styles.conversationDate}>{new Date(item.updated_at).toLocaleDateString(language === "en" ? "en-US" : "fr-FR")}</Text></View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
                </Pressable>
              )}
            />
          </View>
        </View>
      </Modal>
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
  headerCopy: { flex: 1 },
  headerTitle: { ...typography.h3, color: colors.textPrimary },
  headerSubtitle: { ...typography.caption, color: colors.textSecondary },
  headerAction: { width: 38, height: 38, borderRadius: radii.full, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" },
  messagesList: { padding: spacing.xxl, gap: spacing.md },
  bubbleRow: { flexDirection: "row" },
  bubbleRowUser: { justifyContent: "flex-end" },
  bubbleRowAssistant: { justifyContent: "flex-start" },
  bubble: { maxWidth: "82%", borderRadius: radii.lg, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  bubbleUser: { backgroundColor: colors.primary, borderBottomRightRadius: radii.sm },
  bubbleAssistant: { backgroundColor: colors.surface, borderBottomLeftRadius: radii.sm, borderWidth: 1, borderColor: colors.border },
  bubbleTextUser: { ...typography.body, color: colors.white },
  markdownMessage: { gap: spacing.xs },
  markdownLine: { ...typography.body, color: colors.textPrimary },
  markdownHeading: { ...typography.bodyMedium, color: colors.textPrimary, marginTop: spacing.xs },
  markdownBold: { fontWeight: "700" },
  markdownItalic: { fontStyle: "italic" },
  markdownSpace: { height: spacing.xs },
  thinkingIndicator: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  thinkingText: { ...typography.caption, color: colors.textSecondary },
  errorPanel: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginHorizontal: spacing.xxl, marginBottom: spacing.sm, padding: spacing.sm, backgroundColor: `${colors.error}0D`, borderRadius: radii.sm },
  errorText: { ...typography.caption, color: colors.error, flex: 1 },
  retryButton: { flexDirection: "row", alignItems: "center", gap: spacing.xs, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radii.full, backgroundColor: colors.surface },
  retryText: { ...typography.captionMedium, color: colors.primary },
  suggestions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, paddingHorizontal: spacing.xxl, paddingBottom: spacing.sm },
  suggestionChip: { borderWidth: 1, borderColor: colors.border, borderRadius: radii.full, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, backgroundColor: colors.surface },
  suggestionText: { ...typography.caption, color: colors.primary },
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
  documentsWarning: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm, backgroundColor: `${colors.warning}18`, marginHorizontal: spacing.lg, marginBottom: spacing.sm, padding: spacing.sm, borderRadius: radii.sm },
  documentsWarningText: { ...typography.caption, color: colors.textSecondary, flex: 1 },
  clearDocumentsButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  clearDocumentsText: { ...typography.captionMedium, color: colors.textSecondary },
  historyOverlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: "flex-end" },
  historyPanel: { maxHeight: "82%", backgroundColor: colors.surface, borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl, padding: spacing.xl },
  historyHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.md },
  historyTitle: { ...typography.h2, color: colors.textPrimary },
  newConversationButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, minHeight: 46, backgroundColor: colors.primary, borderRadius: radii.md, marginBottom: spacing.md },
  newConversationText: { ...typography.bodyMedium, color: colors.white },
  emptyHistory: { ...typography.body, color: colors.textSecondary, textAlign: "center", paddingVertical: spacing.xxl },
  conversationRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  conversationCopy: { flex: 1 },
  conversationTitle: { ...typography.bodyMedium, color: colors.textPrimary },
  conversationDate: { ...typography.tiny, color: colors.textTertiary, marginTop: 2 },
});
