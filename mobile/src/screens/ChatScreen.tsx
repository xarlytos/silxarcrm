import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { mobileApi } from '../lib/api';
import { colors, borderRadius, shadows, spacing } from '../lib/theme';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  sql?: string;
  time?: number;
}

export default function ChatScreen() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    mobileApi.getIASuggestions()
      .then((res) => setSuggestions(res.data))
      .catch(() => {});
  }, []);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;

    const userMsg: Message = { role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await mobileApi.chatIA(text);
      setMessages((prev) => [...prev, {
        role: 'assistant',
        content: res.data.response,
        sql: res.data.sql,
        time: res.data.time,
      }]);
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Error al procesar tu consulta.' }]);
    } finally {
      setLoading(false);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => (
    <View style={[styles.msgRow, item.role === 'user' && styles.msgRowUser]}>
      <View style={[styles.msgBubble, item.role === 'user' ? styles.userBubble : styles.aiBubble]}>
        <Text style={[styles.msgText, item.role === 'user' && styles.userText]}>
          {item.content}
        </Text>
        {item.time && (
          <Text style={styles.msgTime}>{item.time}ms</Text>
        )}
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={100}
    >
      <Text style={styles.title}>Chat IA</Text>

      {messages.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🧠</Text>
          <Text style={styles.emptyTitle}>Preguntame lo que quieras</Text>
          <Text style={styles.emptySubtitle}>Consulta tus datos con lenguaje natural</Text>
          <View style={styles.suggestionsWrap}>
            {suggestions.slice(0, 4).map((s, i) => (
              <TouchableOpacity key={i} style={styles.suggestionBtn} onPress={() => sendMessage(s)}>
                <Text style={styles.suggestionText}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(_, i) => String(i)}
          contentContainerStyle={{ paddingBottom: 12 }}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
        />
      )}

      {loading && (
        <View style={styles.loadingRow}>
          <ActivityIndicator color={colors.ube[800]} size="small" />
          <Text style={styles.loadingText}>Pensando...</Text>
        </View>
      )}

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Escribe tu pregunta..."
          placeholderTextColor={colors.warm.silver}
          editable={!loading}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!input.trim() || loading) && styles.sendBtnDisabled]}
          onPress={() => sendMessage(input)}
          disabled={!input.trim() || loading}
        >
          <Text style={styles.sendText}>Enviar</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cream, padding: spacing.lg },
  title: { fontSize: 32, fontWeight: '600', color: colors.black, letterSpacing: -0.64, marginBottom: spacing.md },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: colors.black, marginBottom: 4 },
  emptySubtitle: { fontSize: 14, color: colors.warm.silver, marginBottom: 24 },
  suggestionsWrap: { gap: 8, width: '100%' },
  suggestionBtn: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.oat.DEFAULT,
    borderRadius: borderRadius.card,
    padding: 12,
    backgroundColor: colors.white,
  },
  suggestionText: { fontSize: 13, color: colors.warm.charcoal, textAlign: 'center' },
  msgRow: { marginBottom: 8 },
  msgRowUser: { alignItems: 'flex-end' },
  msgBubble: { maxWidth: '80%', borderRadius: borderRadius.card, padding: 14 },
  userBubble: { backgroundColor: colors.black },
  aiBubble: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.oat.DEFAULT, ...shadows.clay },
  msgText: { fontSize: 14, color: colors.black, lineHeight: 20 },
  userText: { color: colors.white },
  msgTime: { fontSize: 10, color: colors.warm.silver, marginTop: 4 },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 },
  loadingText: { fontSize: 13, color: colors.ube[800] },
  inputRow: { flexDirection: 'row', gap: 8, paddingTop: 8 },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#717989',
    borderRadius: 4,
    padding: 12,
    fontSize: 15,
    color: colors.black,
    backgroundColor: colors.white,
  },
  sendBtn: {
    backgroundColor: colors.ube[800],
    borderRadius: borderRadius.lg,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.3 },
  sendText: { color: colors.white, fontWeight: '500', fontSize: 14 },
});
