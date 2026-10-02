import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState, type ReactNode } from 'react';
import { Pressable, RefreshControl, StyleSheet, Text, TextInput, View, type ListRenderItem } from 'react-native';

import { ActionButton } from '@/components/ui/ActionButton';
import { EmptyState } from '@/components/ui/DesignSystem';
import { PaginatedList } from '@/components/ui/PaginatedList';
import { Radii, Spacing, Typography } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';

export type ModuleListFilter = {
  id: string;
  label: string;
  selected: boolean;
  onPress: () => void;
};

type ModuleListTemplateProps<T> = {
  moduleName: string;
  subtitle?: string;
  data: readonly T[];
  getSearchText: (item: T) => string;
  keyExtractor: (item: T, index: number) => string;
  renderItem: ListRenderItem<T>;
  onAdd?: () => void;
  canAdd?: boolean;
  filters?: ModuleListFilter[];
  emptyMessage?: string;
  loading?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  listHeader?: ReactNode;
};

export function ModuleListTemplate<T>({
  moduleName, subtitle, data, getSearchText, keyExtractor, renderItem, onAdd,
  canAdd = true, filters = [], emptyMessage = 'No hay elementos para mostrar.',
  loading = false, refreshing = false, onRefresh, listHeader,
}: ModuleListTemplateProps<T>) {
  const { colors } = useAppTheme();
  const [query, setQuery] = useState('');
  const filteredData = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    if (!normalizedQuery) return data;
    return data.filter((item) => getSearchText(item).toLocaleLowerCase().includes(normalizedQuery));
  }, [data, getSearchText, query]);
  const addLabel = `Agregar ${moduleName.toLocaleLowerCase()}`;

  return (
    <PaginatedList
      data={filteredData}
      mode="client"
      loading={loading}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      keyboardShouldPersistTaps="handled"
      refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} /> : undefined}
      emptyTitle={query ? 'Sin resultados' : `Aún no hay ${moduleName.toLocaleLowerCase()}`}
      emptyMessage={emptyMessage}
      ListHeaderComponent={(
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>{moduleName}</Text>
          {subtitle ? <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text> : null}
          {onAdd && canAdd ? <ActionButton action="add" label={addLabel} onPress={onAdd} fullWidth /> : null}
          <View style={[styles.searchBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="search-outline" size={18} color={colors.textSecondary} accessibilityLabel="Buscar" accessibilityHint={`Busca en ${moduleName}.`} />
            <TextInput
              accessibilityLabel={`Buscar en ${moduleName}`}
              accessibilityHint="Escribe para filtrar la lista."
              value={query}
              onChangeText={setQuery}
              placeholder={`Buscar en ${moduleName.toLocaleLowerCase()}`}
              placeholderTextColor={colors.muted}
              returnKeyType="search"
              style={[styles.searchInput, { color: colors.text }]}
            />
            {query ? <Pressable accessibilityRole="button" accessibilityLabel="Limpiar búsqueda" accessibilityHint="Borra el texto de búsqueda." onPress={() => setQuery('')} hitSlop={8}><Ionicons name="close-circle" size={18} color={colors.textSecondary} /></Pressable> : null}
          </View>
          {filters.length ? (
            <View style={styles.filters}>
              {filters.map((filter) => (
                <Pressable key={filter.id} accessibilityRole="button" accessibilityLabel={filter.label} accessibilityState={{ selected: filter.selected }} onPress={filter.onPress} style={[styles.filter, { backgroundColor: filter.selected ? colors.primarySoft : colors.surface, borderColor: filter.selected ? colors.primary : colors.border }]}>
                  <Text style={[styles.filterText, { color: filter.selected ? colors.primary : colors.textSecondary }]}>{filter.label}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
          {listHeader}
          {filteredData.length === 0 ? (
            <EmptyState title={query ? 'Sin resultados' : `Aún no hay ${moduleName.toLocaleLowerCase()}`} message={emptyMessage} />
          ) : null}
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  header: { gap: Spacing.three, paddingBottom: Spacing.three },
  title: { ...Typography.h1 },
  subtitle: { ...Typography.body },
  searchBox: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingHorizontal: Spacing.three, borderWidth: 1, borderRadius: Radii.medium },
  searchInput: { flex: 1, minHeight: 44, ...Typography.body },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  filter: { minHeight: 36, justifyContent: 'center', paddingHorizontal: Spacing.three, borderWidth: 1, borderRadius: Radii.medium },
  filterText: { ...Typography.caption, fontWeight: '600' },
});