import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState, type ReactElement } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View, type FlatListProps, type ListRenderItem } from 'react-native';

import { PAGE_SIZE, Radii, Spacing, Typography } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';

type PaginationProps = {
  page: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
};

export function Pagination({ page, totalItems, onPageChange, disabled = false }: PaginationProps) {
  const { colors } = useAppTheme();
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const currentPage = Math.min(Math.max(page, 1), totalPages);
  const firstItem = totalItems === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const lastItem = Math.min(currentPage * PAGE_SIZE, totalItems);
  const previousDisabled = disabled || currentPage <= 1;
  const nextDisabled = disabled || currentPage >= totalPages;

  return (
    <View style={[styles.pagination, { borderTopColor: colors.border }]}>
      <Pressable accessibilityRole="button" accessibilityLabel="Anterior" accessibilityHint="Muestra la página anterior." disabled={previousDisabled} onPress={() => onPageChange(currentPage - 1)} style={[styles.pageButton, { borderColor: colors.border }, previousDisabled && styles.disabled]}>
        <Ionicons name="arrow-back" size={17} color={previousDisabled ? colors.muted : colors.primary} />
        <Text style={[styles.pageLabel, { color: previousDisabled ? colors.muted : colors.primary }]}>Anterior</Text>
      </Pressable>
      <Text accessibilityLiveRegion="polite" style={[styles.pageSummary, { color: colors.textSecondary }]}>
        {`Mostrando ${firstItem}–${lastItem} de ${totalItems}`}
      </Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Siguiente" accessibilityHint="Muestra la página siguiente." disabled={nextDisabled} onPress={() => onPageChange(currentPage + 1)} style={[styles.pageButton, { borderColor: colors.border }, nextDisabled && styles.disabled]}>
        <Text style={[styles.pageLabel, { color: nextDisabled ? colors.muted : colors.primary }]}>Siguiente</Text>
        <Ionicons name="arrow-forward" size={17} color={nextDisabled ? colors.muted : colors.primary} />
      </Pressable>
    </View>
  );
}

type PaginatedListProps<T> = Omit<FlatListProps<T>, 'data' | 'renderItem' | 'keyExtractor' | 'onEndReached'> & {
  data: readonly T[];
  renderItem: ListRenderItem<T>;
  keyExtractor: (item: T, index: number) => string;
  loading?: boolean;
  page?: number;
  onPageChange?: (page: number) => void;
  totalItems?: number;
  mode?: 'client' | 'server';
  emptyTitle?: string;
  emptyMessage?: string;
};

export function PaginatedList<T>({
  data, renderItem, keyExtractor, loading = false, page: controlledPage, onPageChange,
  totalItems, mode = 'client', emptyTitle = 'Sin registros',
  emptyMessage = 'No hay elementos para mostrar.', contentContainerStyle, ...listProps
}: PaginatedListProps<T>): ReactElement {
  const { colors } = useAppTheme();
  const listRef = useRef<FlatList<T>>(null);
  const [internalPage, setInternalPage] = useState(1);
  const [changingPage, setChangingPage] = useState(false);
  const isControlled = controlledPage !== undefined;
  const page = isControlled ? controlledPage : internalPage;
  const itemCount = totalItems ?? data.length;
  const totalPages = Math.max(1, Math.ceil(itemCount / PAGE_SIZE));
  const currentPage = Math.min(Math.max(page, 1), totalPages);
  const visibleData = mode === 'client' ? data.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE) : data.slice(0, PAGE_SIZE);

  useEffect(() => {
    if (!changingPage) return;
    const timeout = setTimeout(() => setChangingPage(false), 180);
    return () => clearTimeout(timeout);
  }, [changingPage, page]);

  const changePage = (nextPage: number) => {
    const boundedPage = Math.min(Math.max(nextPage, 1), totalPages);
    if (boundedPage === currentPage) return;
    setChangingPage(true);
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
    if (onPageChange) onPageChange(boundedPage);
    else setInternalPage(boundedPage);
  };

  const isLoading = loading || changingPage;

  return (
    <View style={styles.container}>
      {isLoading ? (
        <View accessibilityRole="progressbar" accessibilityLabel="Cargando página" style={[styles.loading, { backgroundColor: colors.background }]}>
          <ActivityIndicator color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Cargando…</Text>
        </View>
      ) : (
        <FlatList
          {...listProps}
          ref={listRef}
          data={visibleData as T[]}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={[styles.content, contentContainerStyle]}
          ListEmptyComponent={listProps.ListEmptyComponent ?? (
            <View style={styles.empty}>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>{emptyTitle}</Text>
              <Text style={[styles.emptyMessage, { color: colors.textSecondary }]}>{emptyMessage}</Text>
            </View>
          )}
          ListFooterComponent={
            <Pagination page={currentPage} totalItems={itemCount} onPageChange={changePage} disabled={isLoading} />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flexGrow: 1 },
  pagination: { minHeight: 60, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.one, marginTop: Spacing.three, paddingTop: Spacing.two, borderTopWidth: 1 },
  pageButton: { minHeight: 44, minWidth: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.one, paddingHorizontal: Spacing.two, borderWidth: 1, borderRadius: Radii.medium },
  pageLabel: { ...Typography.caption, fontWeight: '700' },
  pageSummary: { ...Typography.caption, textAlign: 'center', flexShrink: 1 },
  disabled: { opacity: 0.5 },
  loading: { flex: 1, minHeight: 140, alignItems: 'center', justifyContent: 'center', gap: Spacing.two },
  loadingText: { ...Typography.caption },
  empty: { alignItems: 'center', paddingVertical: Spacing.seven, paddingHorizontal: Spacing.four, gap: Spacing.two },
  emptyTitle: { ...Typography.h2, textAlign: 'center' },
  emptyMessage: { ...Typography.body, textAlign: 'center' },
});