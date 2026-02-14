import React from 'react';
import { Text, View, Link, StyleSheet } from '@react-pdf/renderer';
import { marked, type Token, type Tokens } from 'marked';

const styles = StyleSheet.create({
  paragraph: {
    fontSize: 10,
    lineHeight: 1.6,
    color: '#374151',
    marginBottom: 6,
  },
  heading2: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 14,
    marginBottom: 6,
  },
  heading3: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 10,
    marginBottom: 4,
  },
  heading4: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#374151',
    marginTop: 8,
    marginBottom: 4,
  },
  bold: {
    fontWeight: 'bold',
  },
  italic: {
    fontStyle: 'italic',
  },
  code: {
    fontFamily: 'Courier',
    fontSize: 9,
    backgroundColor: '#F3F4F6',
    padding: '1 3',
  },
  listItem: {
    fontSize: 10,
    lineHeight: 1.6,
    color: '#374151',
    flexDirection: 'row',
    marginBottom: 2,
    paddingLeft: 8,
  },
  listBullet: {
    width: 12,
    fontSize: 10,
    color: '#6B7280',
  },
  listContent: {
    flex: 1,
    fontSize: 10,
  },
  link: {
    color: '#2563EB',
    textDecoration: 'underline',
  },
  codeBlock: {
    fontFamily: 'Courier',
    fontSize: 8.5,
    backgroundColor: '#F3F4F6',
    padding: 8,
    borderRadius: 4,
    marginBottom: 6,
  },
  blockquote: {
    borderLeftWidth: 2,
    borderLeftColor: '#D1D5DB',
    paddingLeft: 10,
    marginBottom: 6,
  },
  hr: {
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    marginVertical: 10,
  },
});

function renderInlineTokens(tokens: Token[] | undefined): React.ReactNode[] {
  if (!tokens) return [];
  return tokens.map((token, i) => {
    switch (token.type) {
      case 'text': {
        const t = token as Tokens.Text;
        if (t.tokens && t.tokens.length > 0) {
          return <Text key={i}>{renderInlineTokens(t.tokens)}</Text>;
        }
        return <Text key={i}>{t.text}</Text>;
      }
      case 'strong':
        return (
          <Text key={i} style={styles.bold}>
            {renderInlineTokens((token as Tokens.Strong).tokens)}
          </Text>
        );
      case 'em':
        return (
          <Text key={i} style={styles.italic}>
            {renderInlineTokens((token as Tokens.Em).tokens)}
          </Text>
        );
      case 'codespan':
        return (
          <Text key={i} style={styles.code}>
            {(token as Tokens.Codespan).text}
          </Text>
        );
      case 'link':
        return (
          <Link key={i} src={(token as Tokens.Link).href} style={styles.link}>
            {renderInlineTokens((token as Tokens.Link).tokens)}
          </Link>
        );
      case 'br':
        return <Text key={i}>{'\n'}</Text>;
      default:
        if ('text' in token) return <Text key={i}>{(token as { text: string }).text}</Text>;
        return null;
    }
  });
}

function renderListItems(items: Tokens.ListItem[], ordered: boolean): React.ReactNode[] {
  return items.map((item, i) => (
    <View key={i} style={styles.listItem}>
      <Text style={styles.listBullet}>{ordered ? `${i + 1}.` : '\u2022'}</Text>
      <Text style={styles.listContent}>
        {renderInlineTokens(item.tokens)}
      </Text>
    </View>
  ));
}

export function markdownToPdfElements(markdown: string): React.ReactNode[] {
  const tokens = marked.lexer(markdown);
  const elements: React.ReactNode[] = [];

  tokens.forEach((token, i) => {
    switch (token.type) {
      case 'heading': {
        const t = token as Tokens.Heading;
        const style =
          t.depth <= 2 ? styles.heading2 : t.depth === 3 ? styles.heading3 : styles.heading4;
        elements.push(
          <Text key={i} style={style}>
            {renderInlineTokens(t.tokens)}
          </Text>
        );
        break;
      }
      case 'paragraph': {
        const t = token as Tokens.Paragraph;
        elements.push(
          <Text key={i} style={styles.paragraph}>
            {renderInlineTokens(t.tokens)}
          </Text>
        );
        break;
      }
      case 'list': {
        const t = token as Tokens.List;
        elements.push(
          <View key={i}>
            {renderListItems(t.items, t.ordered)}
          </View>
        );
        break;
      }
      case 'code': {
        const t = token as Tokens.Code;
        elements.push(
          <Text key={i} style={styles.codeBlock}>
            {t.text}
          </Text>
        );
        break;
      }
      case 'blockquote': {
        const t = token as Tokens.Blockquote;
        elements.push(
          <View key={i} style={styles.blockquote}>
            {t.tokens.map((child, ci) => {
              if (child.type === 'paragraph') {
                return (
                  <Text key={ci} style={styles.paragraph}>
                    {renderInlineTokens((child as Tokens.Paragraph).tokens)}
                  </Text>
                );
              }
              return null;
            })}
          </View>
        );
        break;
      }
      case 'hr':
        elements.push(<View key={i} style={styles.hr} />);
        break;
      case 'space':
        break;
      default:
        if ('tokens' in token && Array.isArray((token as Record<string, unknown>).tokens)) {
          elements.push(
            <Text key={i} style={styles.paragraph}>
              {renderInlineTokens((token as { tokens: Token[] }).tokens)}
            </Text>
          );
        } else if ('text' in token) {
          elements.push(
            <Text key={i} style={styles.paragraph}>
              {(token as { text: string }).text}
            </Text>
          );
        }
    }
  });

  return elements;
}
